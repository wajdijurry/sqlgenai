import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import current_app

def get_encryption_key():
    """Get the encryption key from the app secret key"""
    # Use the app's secret key as the password
    password = current_app.config['SECRET_KEY'].encode()
    
    # Use a static salt (in production, this should be stored securely)
    salt = b'sqlgenai_static_salt'
    
    # Derive a key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000
    )
    
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key

def encrypt_password(password):
    """Encrypt a database password"""
    if not password:
        return ''
    
    key = get_encryption_key()
    f = Fernet(key)
    encrypted_password = f.encrypt(password.encode())
    return encrypted_password.decode()

def decrypt_password(encrypted_password):
    """Decrypt a database password"""
    if not encrypted_password:
        return ''
    
    key = get_encryption_key()
    f = Fernet(key)
    decrypted_password = f.decrypt(encrypted_password.encode())
    return decrypted_password.decode()
