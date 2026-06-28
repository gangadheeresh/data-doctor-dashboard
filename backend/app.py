import os
from flask import Flask, jsonify
from flask_cors import CORS
from database import db
from config import Config
from models import User, UserSettings, PasswordResetOTP

# Import blueprints
from auth import auth_bp
from datasets import datasets_bp
from insights import insights_bp
from forecast import forecast_bp
from advanced import advanced_bp
from query import query_bp
from reports import reports_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS - allow all origins, let frontend communicate freely
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    # Initialize DB
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(datasets_bp, url_prefix='/api/datasets')
    app.register_blueprint(insights_bp, url_prefix='/api/insights')
    app.register_blueprint(forecast_bp, url_prefix='/api/forecast')
    app.register_blueprint(advanced_bp, url_prefix='/api/advanced')
    app.register_blueprint(query_bp, url_prefix='/api/query')
    app.register_blueprint(reports_bp, url_prefix='/api/export')
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'AI Data Analytics Dashboard API is running'}), 200
        
    with app.app_context():
        db.create_all()
        # Seed default admin user if not exists
        if not User.query.filter_by(username='admin').first():
            try:
                admin_user = User(username='admin', email='admin@datadoctor.com', phone_number='0000000000')
                admin_user.set_password('admin123')
                db.session.add(admin_user)
                db.session.flush()
                admin_settings = UserSettings(user_id=admin_user.id, theme='dark')
                db.session.add(admin_settings)
                db.session.commit()
                print("Default admin user seeded successfully.")
            except Exception as e:
                db.session.rollback()
                print(f"Failed to seed default admin user: {e}")
        print("Database schemas initialized.")
        
    return app

app = create_app()

if __name__ == '__main__':
    # Run server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
