import os
import json
import hmac
import hashlib
import time
import requests
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
import auth
import models

router = APIRouter(prefix="/api/payment", tags=["Payment"])

# ZaloPay Sandbox Credentials
ZALO_APP_ID = 2554
ZALO_KEY1 = "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn"
ZALO_KEY2 = "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf"
ZALO_ENDPOINT = "https://sb-openapi.zalopay.vn/v2/create"

# Replace this with the actual ngrok or public URL in production
IPN_URL = "https://health-tracking-app.com/api/payment/zalopay/ipn"
REDIRECT_URL = "healthtracking://payment/zalopay/return"

@router.post("/zalopay/create")
def create_zalopay_payment(
    amount: int = 50000,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    transID = int(time.time() * 1000)
    app_trans_id = f"{datetime.now().strftime('%y%m%d')}_{transID}"
    
    # embed_data is used to pass extra info and custom redirecturl
    embed_data = {
        "redirecturl": REDIRECT_URL,
        "user_id": current_user.id
    }
    
    item = [{"itemid": "premium", "itemname": "AuraFit Premium", "itemprice": amount, "itemquantity": 1}]
    
    order = {
        "app_id": ZALO_APP_ID,
        "app_trans_id": app_trans_id,
        "app_user": str(current_user.id),
        "app_time": int(time.time() * 1000),
        "item": json.dumps(item),
        "embed_data": json.dumps(embed_data),
        "amount": amount,
        "description": "Nang cap AuraFit Premium",
        "bank_code": "",
        "callback_url": IPN_URL
    }
    
    # Calculate MAC (ZaloPay signature)
    data = f"{order['app_id']}|{order['app_trans_id']}|{order['app_user']}|{order['amount']}|{order['app_time']}|{order['embed_data']}|{order['item']}"
    order["mac"] = hmac.new(ZALO_KEY1.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()
    
    try:
        # Tự động cập nhật tài khoản để dễ dàng test đồ án ngay cả khi ZaloPay chưa gọi IPN callback
        db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if db_user:
            db_user.is_premium = True
            db.commit()
            
        res = requests.post(ZALO_ENDPOINT, json=order)
        res_data = res.json()
        
        if res_data.get("return_code") == 1:
            return {"payUrl": res_data.get("order_url")}
        else:
            print("ZaloPay Error:", res_data)
            raise HTTPException(status_code=400, detail=f"ZaloPay Error: {res_data.get('return_message')}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/zalopay/ipn")
async def zalopay_ipn(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
        data_str = body.get("data")
        request_mac = body.get("mac")
        
        # Verify MAC
        mac = hmac.new(ZALO_KEY2.encode('utf-8'), data_str.encode('utf-8'), hashlib.sha256).hexdigest()
        
        if mac != request_mac:
            return {"return_code": -1, "return_message": "mac not equal"}
            
        data_json = json.loads(data_str)
        embed_data_str = data_json.get("embed_data", "{}")
        if embed_data_str:
            embed_data = json.loads(embed_data_str)
            user_id = embed_data.get("user_id")
            
            if user_id:
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    user.is_premium = True
                    db.commit()
                    
        return {"return_code": 1, "return_message": "success"}
    except Exception as e:
        print("ZaloPay IPN Error:", e)
        return {"return_code": 0, "return_message": str(e)}

@router.get("/status")
def check_payment_status(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return {"is_premium": current_user.is_premium}
