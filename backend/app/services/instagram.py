import requests
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

class InstagramService:
    """Service for Instagram Graph API integration"""
    
    def __init__(self, access_token: str, instagram_business_account_id: str):
        self.access_token = access_token
        self.instagram_business_account_id = instagram_business_account_id
        self.base_url = "https://graph.facebook.com/v18.0"
    
    def get_conversations(self, limit: int = 25) -> List[Dict]:
        """Get Instagram Direct message conversations"""
        try:
            url = f"{self.base_url}/{self.instagram_business_account_id}/conversations"
            params = {
                "access_token": self.access_token,
                "limit": limit,
                "fields": "id,participants,updated_time"
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Error fetching Instagram conversations: {e}")
            return []
    
    def get_messages(self, conversation_id: str, limit: int = 50) -> List[Dict]:
        """Get messages from a conversation"""
        try:
            url = f"{self.base_url}/{conversation_id}"
            params = {
                "access_token": self.access_token,
                "fields": "messages{id,from,to,created_time,message,attachments}"
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return data.get("messages", {}).get("data", [])
        except Exception as e:
            logger.error(f"Error fetching messages for conversation {conversation_id}: {e}")
            return []
    
    def send_message(self, recipient_id: str, message_text: str) -> Optional[str]:
        """Send a message to a user"""
        try:
            url = f"{self.base_url}/me/messages"
            data = {
                "recipient": {"id": recipient_id},
                "message": {"text": message_text}
            }
            params = {"access_token": self.access_token}
            
            response = requests.post(url, json=data, params=params)
            response.raise_for_status()
            result = response.json()
            
            return result.get("message_id")
        except Exception as e:
            logger.error(f"Error sending Instagram message: {e}")
            return None
    
    def get_user_info(self, user_id: str) -> Optional[Dict]:
        """Get Instagram user information"""
        try:
            url = f"{self.base_url}/{user_id}"
            params = {
                "access_token": self.access_token,
                "fields": "id,username,name,profile_picture_url"
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching user info for {user_id}: {e}")
            return None
    
    def get_media_comments(self, media_id: str, limit: int = 50) -> List[Dict]:
        """Get comments on a media post"""
        try:
            url = f"{self.base_url}/{media_id}/comments"
            params = {
                "access_token": self.access_token,
                "limit": limit,
                "fields": "id,from,text,timestamp,username"
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Error fetching comments for media {media_id}: {e}")
            return []
    
    def reply_to_comment(self, comment_id: str, message_text: str) -> Optional[str]:
        """Reply to a comment"""
        try:
            url = f"{self.base_url}/{comment_id}/replies"
            data = {"message": message_text}
            params = {"access_token": self.access_token}
            
            response = requests.post(url, json=data, params=params)
            response.raise_for_status()
            result = response.json()
            
            return result.get("id")
        except Exception as e:
            logger.error(f"Error replying to comment {comment_id}: {e}")
            return None
    
    def get_recent_media(self, limit: int = 10) -> List[Dict]:
        """Get recent media posts"""
        try:
            url = f"{self.base_url}/{self.instagram_business_account_id}/media"
            params = {
                "access_token": self.access_token,
                "limit": limit,
                "fields": "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count"
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Error fetching recent media: {e}")
            return []
    
    @staticmethod
    def verify_webhook_token(mode: str, token: str, verify_token: str) -> bool:
        """Verify webhook subscription"""
        return mode == "subscribe" and token == verify_token


