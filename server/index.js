import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./config/mongo.js";
import sessionRoutes from "./routes/session.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import searchRoutes from "./routes/search.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import forumsRoutes from "./routes/forums.routes.js";
import { ForumCategory } from "./models/ForumCategory.js";
import trialsRoutes from "./routes/trials.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import insightsRoutes from "./routes/insights.routes.js";
import followRoutes from "./routes/follow.routes.js";
import messagesRoutes from "./routes/messages.routes.js";

dotenv.config();

const app = express();

// Enhanced CORS configuration for all origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow cookies if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check endpoint
app.get("/", (_req, res) => {
  res.send("CuraLink backend is running 🚀");
});

// API routes
app.use("/api", sessionRoutes);
app.use("/api", profileRoutes);
app.use("/api", searchRoutes);
app.use("/api", recommendationsRoutes);
app.use("/api", favoritesRoutes);
app.use("/api", forumsRoutes);
app.use("/api", trialsRoutes);
app.use("/api", aiRoutes);
app.use("/api", insightsRoutes);
app.use("/api", followRoutes);
app.use("/api", messagesRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectMongo();
  
  // Seed forum categories (only in development or first deploy)
  if (process.env.NODE_ENV !== 'production') {
    const defaults = [
      { slug: "lung-cancer", name: "Lung Cancer" },
      { slug: "heart-related", name: "Heart Related" },
      { slug: "cancer-research", name: "Cancer Research" },
      { slug: "neurology", name: "Neurology" },
      { slug: "oncology", name: "Oncology" },
      { slug: "cardiology", name: "Cardiology" },
      { slug: "clinical-trials", name: "Clinical Trials" },
      { slug: "general-health", name: "General Health" },
    ];
    
    for (const c of defaults) {
      await ForumCategory.updateOne(
        { slug: c.slug },
        { $setOnInsert: c },
        { upsert: true }
      );
    }
  }
  
  // Only listen when not in Vercel environment
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }
}

// Export the Express app for Vercel
export default app;

// Only start the server if not in Vercel production environment
if (process.env.NODE_ENV !== 'production') {
  start().catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });
}