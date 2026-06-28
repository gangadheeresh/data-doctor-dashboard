import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-123'
    
    # Database Configuration (Supabase PostgreSQL fallback to local SQLite)
    SUPABASE_URI = 'postgresql://postgres.zthwqgxupmxjpgpchpfa:Dheereshganga%40009@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    if SUPABASE_URI:
        # SQLAlchemy requires postgresql:// instead of postgres:// in newer versions, 
        # but Supabase provides postgresql:// so we are good.
        SQLALCHEMY_DATABASE_URI = SUPABASE_URI
    else:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'dashboard.db')
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}
    
    # Upload Settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB max file upload size
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

    # Email configuration (Resend API)
    RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
    RESEND_FROM_EMAIL = os.environ.get('RESEND_FROM_EMAIL', 'onboarding@resend.dev')

    # SMTP Email Settings (Configure to send real emails)
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USER = os.environ.get('SMTP_USER', '')          # e.g. your_gmail@gmail.com
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')  # e.g. your_app_password
    SMTP_FROM = os.environ.get('SMTP_FROM', '')          # e.g. your_gmail@gmail.com

    # Ensure upload directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
