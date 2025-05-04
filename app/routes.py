from flask import render_template, send_from_directory, Blueprint

# Create a blueprint for the main routes
main = Blueprint('main', __name__)

# Main route
@main.route('/')
def index():
    """Main landing page"""
    return render_template('index.html')

# Register the blueprint in __init__.py
def init_app(app):
    app.register_blueprint(main)
