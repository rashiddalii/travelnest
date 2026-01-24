import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("Admin client not configured:", error);
      return NextResponse.json(
        {
          error:
            "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in travelnest-web/.env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await admin.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      
      // Check if bucket doesn't exist
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("bucket")) {
        return NextResponse.json(
          { 
            error: "Storage bucket 'avatars' not configured. Please run the storage setup SQL in Supabase Dashboard. See travelnest-web/supabase/storage-setup.sql"
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to upload file: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from("avatars").getPublicUrl(fileName);

    // Update profile with new avatar URL
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
    });
  } catch (error) {
    console.error("Unexpected error uploading avatar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete avatar endpoint
export async function DELETE() {
  try {
    const supabase = await createClient();
    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("Admin client not configured:", error);
      return NextResponse.json(
        {
          error:
            "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in travelnest-web/.env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get current avatar URL to delete from storage
    const { data: profile } = await admin
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    // Clear avatar URL in profile
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }

    // Try to delete file from storage if it exists
    if (profile?.avatar_url) {
      try {
        // Extract file path from URL
        const urlParts = profile.avatar_url.split("/avatars/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await admin.storage.from("avatars").remove([filePath]);
        }
      } catch (err) {
        // Log but don't fail if storage deletion fails
        console.error("Failed to delete avatar file:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error deleting avatar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
