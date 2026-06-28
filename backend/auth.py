import uuid
import random
from datetime import datetime, timedelta
import secrets
import resend
import os
from flask import Blueprint, request, jsonify, g
from functools import wraps
from database import db
from models import User, UserSettings, PasswordResetOTP
from config import Config

auth_bp = Blueprint('auth', __name__)

# Stateful session store mapping token -> user_id
ACTIVE_SESSIONS = {}

def get_current_user():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_id = ACTIVE_SESSIONS.get(token)
        if user_id:
            return db.session.get(User, user_id)
    return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        g.user = user
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    phone_number = data.get('phone_number')
    
    if not username or not email or not password or not phone_number:
        return jsonify({'error': 'Username, email, phone number, and password are required'}), 400
        
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    if User.query.filter_by(phone_number=phone_number).first():
        return jsonify({'error': 'Phone number already registered'}), 400
        
    try:
        user = User(username=username, email=email, phone_number=phone_number)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # Get user.id
        
        # Initialize default settings
        settings = UserSettings(user_id=user.id, theme='dark')
        db.session.add(settings)
        db.session.commit()
        
        # Log the user in automatically
        token = str(uuid.uuid4())
        ACTIVE_SESSIONS[token] = user.id
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username_or_email = data.get('username')  # can be username or email
    password = data.get('password')
    
    if not username_or_email or not password:
        return jsonify({'error': 'Username/Email and password are required'}), 400
        
    # Try finding by username first, then email
    user = User.query.filter((User.username == username_or_email) | (User.email == username_or_email)).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username/email or password'}), 401
        
    token = str(uuid.uuid4())
    ACTIVE_SESSIONS[token] = user.id
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        ACTIVE_SESSIONS.pop(token, None)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/profile', methods=['GET', 'PUT'])
@login_required
def profile():
    user = g.user
    if request.method == 'GET':
        settings = UserSettings.query.filter_by(user_id=user.id).first()
        return jsonify({
            'user': user.to_dict(),
            'settings': settings.to_dict() if settings else {'theme': 'dark', 'gemini_api_key': ''}
        }), 200
        
    elif request.method == 'PUT':
        data = request.get_json() or {}
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        theme = data.get('theme')
        gemini_api_key = data.get('gemini_api_key')
        profile_pic = data.get('profile_pic')
        phone_number = data.get('phone_number')
        
        try:
            if username:
                # Check conflicts
                conflict = User.query.filter(User.username == username, User.id != user.id).first()
                if conflict:
                    return jsonify({'error': 'Username already taken'}), 400
                user.username = username
            if email:
                conflict = User.query.filter(User.email == email, User.id != user.id).first()
                if conflict:
                    return jsonify({'error': 'Email already registered'}), 400
                user.email = email
            if phone_number:
                conflict = User.query.filter(User.phone_number == phone_number, User.id != user.id).first()
                if conflict:
                    return jsonify({'error': 'Phone number already registered'}), 400
                user.phone_number = phone_number
            if password:
                user.set_password(password)
                
            # Handle settings
            settings = UserSettings.query.filter_by(user_id=user.id).first()
            if not settings:
                settings = UserSettings(user_id=user.id)
                db.session.add(settings)
            if theme:
                settings.theme = theme
            if gemini_api_key is not None:
                settings.gemini_api_key = gemini_api_key
            if profile_pic is not None:
                settings.profile_pic = profile_pic
                
            db.session.commit()
            return jsonify({
                'message': 'Profile updated successfully',
                'user': user.to_dict(),
                'settings': settings.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'No account associated with this email'}), 404
        
    try:
        otp_record = PasswordResetOTP.query.filter_by(email=email).first()
        
        # Check cooldown
        if otp_record:
            time_since_sent = (datetime.utcnow() - otp_record.last_sent_at).total_seconds()
            if time_since_sent < 60:
                return jsonify({'error': f'Please wait {int(60 - time_since_sent)} seconds before requesting a new code.'}), 429
            # Delete old record to create a fresh one
            db.session.delete(otp_record)
            db.session.commit()
            
        # Generate secure 6-digit OTP code
        otp = str(secrets.SystemRandom().randint(100000, 999999))
        
        # Save OTP to DB (5 min expiry)
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        new_otp_record = PasswordResetOTP(email=email, otp=otp, expires_at=expires_at, attempts=0)
        db.session.add(new_otp_record)
        db.session.commit()
        
        # Send Real Email via Resend or Fallback to Local Outbox
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Verification</h2>
            <p style="color: #555;">You requested a password reset for your Data Doctor (DD) account.</p>
            <p style="color: #555;">Your 6-digit verification code is:</p>
            <div style="background-color: #f4f4f5; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111;">{otp}</span>
            </div>
            <p style="color: #777; font-size: 14px;">This code will expire in 5 minutes. If you did not request this, please safely ignore this email.</p>
        </div>
        """
        
        if not Config.RESEND_API_KEY or Config.RESEND_API_KEY == 're_placeholder_key_here':
            # Fallback for development without API key: Write to local outbox
            outbox_dir = os.path.join(os.path.dirname(__file__), 'outbox')
            os.makedirs(outbox_dir, exist_ok=True)
            outbox_file = os.path.join(outbox_dir, f"{email}_latest.html")
            with open(outbox_file, "w") as f:
                f.write(html_body)
        else:
            # Production Resend API call
            resend.api_key = Config.RESEND_API_KEY
            params = {
                "from": Config.RESEND_FROM_EMAIL,
                "to": [email],
                "subject": "Your Data Doctor Verification Code",
                "html": html_body
            }
            resend.Emails.send(params)
        
        return jsonify({
            'message': 'Verification code sent successfully.'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to send verification code: {str(e)}'}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json() or {}
    email = data.get('email')
    otp = data.get('otp')
    
    if not email or not otp:
        return jsonify({'error': 'Email and verification code are required'}), 400
        
    otp_record = PasswordResetOTP.query.filter_by(email=email).first()
    
    if not otp_record:
        return jsonify({'error': 'No pending verification found.'}), 400
        
    if datetime.utcnow() > otp_record.expires_at:
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({'error': 'Verification code has expired'}), 400
        
    if otp_record.attempts >= 3:
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({'error': 'Too many failed attempts. Please request a new code.'}), 400
        
    if otp_record.otp != otp:
        otp_record.attempts += 1
        db.session.commit()
        remaining = 3 - otp_record.attempts
        return jsonify({'error': f'Invalid verification code. {remaining} attempts remaining.'}), 400
        
    try:
        otp_record.is_verified = True
        db.session.commit()
        return jsonify({'message': 'Verification code validated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Verification failed: {str(e)}'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    email = data.get('email')
    otp = data.get('otp')
    new_password = data.get('password')
    
    if not email or not otp or not new_password:
        return jsonify({'error': 'All fields are required'}), 400
        
    # Check if there is a verified OTP record
    otp_record = PasswordResetOTP.query.filter_by(email=email, otp=otp, is_verified=True).first()
    if not otp_record:
        return jsonify({'error': 'OTP verification required first'}), 400
        
    if datetime.utcnow() > otp_record.expires_at:
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({'error': 'Session expired. Please request a new verification code.'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Associated account not found'}), 404
        
    try:
        # Set new password
        user.set_password(new_password)
        # Delete OTP record so it can't be reused
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({'message': 'Password has been reset successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to reset password: {str(e)}'}), 500
