import admin from 'firebase-admin';
import { firebase } from '../serviceAccountKey.js'
import { ApiError } from "../utils/ApiError.js";
import { FCMDevice } from "../models/user.model.js"

admin.initializeApp({
    credential: admin.credential.cert(firebase),
});


export const authenticateToken = async (req, res, next) => {
  const { provider, token } = req.body
  
  if(!provider){
      return next();
  }
  if (!token) {
      return res.status(401).json(new ApiError(401, "Access token required"));
  }
  try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
  } catch (error) {
      return res.status(401).json(new ApiError(401, "Invalid Access Token"));
  }

};


const db = admin.firestore();

export const addDataToFirestore = async(req, res) => {
  try {
    const data = {
      name: 'John Doe',
      age: 30,
      email: 'johndoe@example.com',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const res = await db.collection('delivery_locations').add(data);
    
    console.log('Document written with ID: ', res.id);
  } catch (error) {
    console.error('Error adding document: ', error);
  }
  
}


// send notification for multiple device
export const sendFirebasePush = async (user_id, message) => {
  try {
    const devices = await FCMDevice.find({ user_id });

    if (!devices.length) {
      console.warn(`⚠️ No devices found for user ${user_id}`);
      return;
    }

    const tokens = devices
      .map(d => d.fcm_token)
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`⚠️ No valid FCM tokens for user ${user_id}`);
      return;
    }

    const payload = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {},
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload,
    });

    console.log("📨 FCM Sent:", response.successCount, "success");
  } catch (error) {
    console.error("🔥 FCM Error:", error);
  }
};

// send notification for single device
// export const sendNotification = async (user_id, message) => {
//   try {
//     const device = await FCMDevice.findOne({ user_id : user_id });

//     if (!device || !device.fcm_token) {
//       throw new Error('User not found or FCM token missing');
//     }

//     const payload = {
//       notification: {
//         title: message.title,
//         body: message.body,
//       },
//       token: device.fcm_token,
//     };

//     const response = await admin.messaging().send(payload);
//     console.log('Successfully sent message:', response);
//   } catch (error) {
//     console.error('Error sending message:', error.message);
//   }
// };