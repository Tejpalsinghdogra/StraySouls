# 🐾 StraySouls - Every Paw Matters

StraySouls is a community-driven platform designed to streamline the reporting, rescue, and adoption of stray animals. By leveraging **Google Gemini AI** for image analysis and **Real-time Socket.io** for coordination, the platform connects citizens, volunteers, and NGOs into a cohesive rescue ecosystem — and rewards them for their compassion through a gamified **Soul Points** system.

---

## 🚀 Key Features

### 🤖 AI-Powered Image Verification
Every report undergoes automated analysis using **Google Gemini AI**:
- **Species Detection**: Automatically identifies if the photo contains a dog, cat, or other animal.
- **Urgency Assessment**: Detects visible injuries or critical conditions to prioritize rescue efforts.
- **Narrative Generation**: Automatically generates a detailed description of the animal based on the image to help responders.

### 🗺️ Smart Rescue Routing
The system intelligently routes reports based on the scale of the situation:
- **1-2 Strays**: Notifies local nearby **volunteers** for quick, individual rescue.
- **3+ Strays (Mass Rescue)**: Automatically escalates the report to registered **NGOs & Shelters** equipped for large-scale operations.

### 🔴 Real-time Live Heatmap
Visualizes "Critical Zones" across the city in real-time.
- **High Urgency (Red)**: Critical injury reports.
- **Medium Urgency (Orange)**: Healthy strays in unsafe environments.
- **Low Urgency (Blue/Green)**: General sightings and feeding points.

### 🛡️ Verified Completion Policy
To ensure accountability, volunteers must submit **"Proof of Rescue"** (a photo of the animal in safe care). Admins manually verify these proofs before a task is marked as "Resolved" and removed from the active board.

### 💜 Sterilization Reporting
For mass stray sightings (3+ animals), reporters can flag a case specifically for **Sterilization**. This urgency option is conditionally enabled only when the reported count exceeds 2, ensuring sterilization drives are directed at areas with genuine need.

### 🎁 Soul Points — Gamified Rewards System
Users earn **Soul Points** for contributing to the platform. Points can be redeemed in the **Soul Store** for exclusive rewards.

#### How Points Are Earned

| Action | Who Earns | Points |
| :--- | :--- | :---: |
| Volunteer accepts a rescue task | Volunteer | **+20** |
| NGO/Shelter accepts a rescue task | NGO/Shelter | **+30** |
| Admin verifies a completed rescue | Original Reporter | **+10** |
| Admin verifies a completed rescue | Volunteer (who did the rescue) | **+50** |
| Admin verifies a completed rescue | NGO/Shelter (mass rescue) | **+100** |

#### The Soul Store
Redeem points for rewards including:
- 🏅 **Digital Badges** — Showcase your dedication on your profile.
- 🎟️ **Partner Coupons** — Discounts at pet stores and partner brands.
- 🤝 **Charity Donations** — Sponsor a shelter animal on your behalf.
- 👕 **Exclusive Merchandise** — Official StraySouls community gear.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (Poppins font, Modern Responsive UI)
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.io (Live broadcasts & notifications)
- **Database**: MongoDB (Mongoose ODM)
- **AI Integration**: Google Generative AI (Gemini Flash 2.0)
- **Cloud Media**: Cloudinary (Image storage & processing)
- **Maps**: Leaflet.js with OpenStreetMap

---

## 📦 Installation & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed.
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas URI.
- [Cloudinary](https://cloudinary.com/) account.
- [Google AI Studio](https://aistudio.google.com/) Gemini API Key.

### 2. Clone the Repository
```bash
git clone https://github.com/Tejpalsinghdogra/StraySouls.git
cd StraySouls
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Configuration
Create a `.env` file in the root directory and add the following:
```env
# Server Config
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/straysouls

# Security
JWT_SECRET=your_jwt_secret_here

# Third Party APIs
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Seed the Soul Store
Populate the rewards catalog with initial items:
```bash
node seedRewards.js
```

### 6. Running the Application
I have added a custom script to handle port conflicts automatically:
```bash
npm run dev
```
The server will start on [http://localhost:3000](http://localhost:3000).

---

## 👥 User Roles & Portals

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **Citizen** | Public | Report strays, request medical help, view heatmap, redeem Soul Points. |
| **Volunteer** | Portal | Accept rescue tasks, submit proof of completion, earn Soul Points. |
| **NGO/Shelter** | Dashboard | Manage mass rescue reports, update shelter capacity, earn Soul Points. |
| **Admin** | Panel | Verify completion proofs, manage NGO records, create rewards, system oversight. |

---

## 📂 Project Structure
- `/public`: Frontend assets (HTML, CSS, JS) including the Soul Store (`rewards.html`).
- `/controller`: Request handlers and business logic (auth, reports, tasks, rewards).
- `/router`: API endpoint definitions.
- `/models`: Mongoose schemas for Users, Reports, Tasks, Shelters, Rewards, and Redemptions.
- `/middlewares`: Authentication and role-based access control.
- `/utils`: Helper functions (AI analysis, Cloudinary config).

---

## 🤝 Contributing
Contributions are welcome! If you'd like to improve StraySouls:
1. Fork the repo.
2. Create a feature branch.
3. Submit a pull request.

**Every paw counts! 🐾**
