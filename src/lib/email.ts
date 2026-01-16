/**
 * Email service for sending invitation emails
 * Currently logs email details - email service to be implemented later
 */

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  tripTitle: string;
  invitationLink: string;
  isNewUser: boolean;
  role: "editor" | "viewer";
}

export async function sendInvitationEmail({
  to,
  inviterName,
  tripTitle,
  invitationLink,
  isNewUser,
  role,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  const roleText = role === "editor" ? "Editor" : "Viewer";
  const subject = isNewUser
    ? `${inviterName} invited you to join "${tripTitle}" on TravelNest`
    : `${inviterName} invited you to join "${tripTitle}"`;

  // Log email details (email service to be implemented later)
  console.log("📧 [EMAIL LOG] Invitation email would be sent:", {
    to,
    subject,
    inviterName,
    tripTitle,
    invitationLink,
    isNewUser,
    role: roleText,
    timestamp: new Date().toISOString(),
  });

  // Always return success for now - email service will be implemented later
  return { success: true };
}
