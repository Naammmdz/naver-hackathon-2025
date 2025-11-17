#!/bin/bash

echo "📧 DevFlow Email Service Setup"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Email Service Configuration
PORT=3001

# Email Provider Settings
# Options: 'gmail' or 'smtp'
EMAIL_SERVICE=gmail

# For Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# For SMTP (if not using Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit .env file and set your EMAIL_USER and EMAIL_PASSWORD"
echo "2. For Gmail: Use App Password (not regular password)"
echo "3. Run 'npm start' to start the email service"
echo ""

