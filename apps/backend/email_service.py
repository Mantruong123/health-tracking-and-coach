import os
import resend

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

SENDER_EMAIL = "onboarding@resend.dev"

def send_activation_email(to_email: str, token: str):
    if not RESEND_API_KEY:
        print(f"Warning: RESEND_API_KEY not set. Would send activation to {to_email} with token {token}")
        return False
        
    activation_link = f"http://localhost:3000/?action=activate&token={token}"
    
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
        <h2 style="color: #0f172a; text-align: center;">Chào mừng bạn đến với AuraFit! 🏋️‍♂️</h2>
        <p style="color: #334155; font-size: 16px;">Cảm ơn bạn đã đăng ký tài khoản. Để bắt đầu sử dụng dịch vụ, vui lòng xác nhận địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{activation_link}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Nếu nút không hoạt động, bạn có thể copy và dán đường dẫn sau vào trình duyệt:</p>
        <p style="color: #0ea5e9; font-size: 14px; word-break: break-all;">{activation_link}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Email này được gửi tự động từ hệ thống AuraFit. Vui lòng không trả lời.</p>
    </div>
    """
    
    try:
        r = resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": to_email,
            "subject": "Xác nhận tài khoản AuraFit của bạn",
            "html": html_content
        })
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def send_reset_password_email(to_email: str, token: str):
    if not RESEND_API_KEY:
        print(f"Warning: RESEND_API_KEY not set. Would send reset pass to {to_email} with token {token}")
        return False
        
    reset_link = f"http://localhost:3000/?action=reset_password&token={token}"
    
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
        <h2 style="color: #0f172a; text-align: center;">Khôi phục mật khẩu AuraFit 🔒</h2>
        <p style="color: #334155; font-size: 16px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email. Liên kết này sẽ hết hạn trong vòng 24 giờ.</p>
        <p style="color: #64748b; font-size: 14px;">Nếu nút không hoạt động, bạn có thể copy và dán đường dẫn sau vào trình duyệt:</p>
        <p style="color: #0ea5e9; font-size: 14px; word-break: break-all;">{reset_link}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Email này được gửi tự động từ hệ thống AuraFit. Vui lòng không trả lời.</p>
    </div>
    """
    
    try:
        r = resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": to_email,
            "subject": "Yêu cầu khôi phục mật khẩu AuraFit",
            "html": html_content
        })
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
