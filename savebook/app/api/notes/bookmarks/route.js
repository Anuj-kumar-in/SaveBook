import connectToDatabase from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import Notes from "@/lib/models/Notes";
import { verifyJwtToken } from "@/lib/utils/jwtAuth";

// ======================
// ADD / REMOVE BOOKMARK
// ======================
export async function POST(req) {
  try {
    const { noteId } = await req.json();

    if (!noteId) {
      return new Response(
        JSON.stringify({ error: "Note ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get token from cookies
    const token = req.cookies.get("authToken")?.value;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify token
    const tokenInfo = await verifyJwtToken(token);

    if (!tokenInfo || !tokenInfo.success) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await connectToDatabase();

    // Check note exists
    const note = await Notes.findById(noteId);

    if (!note) {
      return new Response(
        JSON.stringify({ error: "Note not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get current user
    const currentUser = await User.findById(tokenInfo.userId);

    if (!currentUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check bookmark exists
    const isBookmarked = currentUser.bookmarks.some(
      (id) => id.toString() === noteId,
    );

    if (isBookmarked) {
      // Remove bookmark
      currentUser.bookmarks = currentUser.bookmarks.filter(
        (id) => id.toString() !== noteId,
      );
    } else {
      // Add bookmark
      currentUser.bookmarks.push(noteId);
    }

    await currentUser.save();

    return new Response(
      JSON.stringify({
        success: true,
        isBookmarked: !isBookmarked,
        message: isBookmarked
          ? "Bookmark removed"
          : "Bookmark added",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Bookmark toggle error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// ======================
// GET ALL BOOKMARKS
// ======================
export async function GET(req) {
  try {
    // Get token
    const token = req.cookies.get("authToken")?.value;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify token
    const tokenInfo = await verifyJwtToken(token);

    if (!tokenInfo || !tokenInfo.success) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await connectToDatabase();

    // Get bookmarked notes
    const currentUser = await User.findById(
      tokenInfo.userId,
    ).populate("bookmarks");

    if (!currentUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookmarks: currentUser.bookmarks || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Fetch bookmarks error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}