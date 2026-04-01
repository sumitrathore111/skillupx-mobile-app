// Using Brevo HTTP API (works on Render - SMTP is blocked)
// No nodemailer needed - using fetch directly

// Email templates
interface EmailTemplate {
  subject: string;
  html: string;
}

// Base email template with consistent styling
const getEmailWrapper = (content: string, title: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">SkillUpX</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your Learning Platform</p>
    </div>
    <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
      ${content}
    </div>
    <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
      <p>© ${new Date().getFullYear()} SkillUpX. All rights reserved.</p>
      <p>You received this email because you have notifications enabled.</p>
    </div>
  </div>
</body>
</html>
`;

// Email Templates for different features
const emailTemplates = {
  // Project notifications
  newProject: (projectTitle: string, creatorName: string): EmailTemplate => ({
    subject: `🚀 Exciting News! New Project Just Launched: ${projectTitle}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">🚀</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">A New Project Just Dropped!</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 25px;">Don't miss this opportunity to collaborate!</p>

      <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #667eea;">
        <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 20px;">📌 ${projectTitle}</h3>
        <div style="display: flex; align-items: center; margin-top: 10px;">
          <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">👤 Created by ${creatorName}</span>
        </div>
      </div>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="color: #856404; margin: 0; font-weight: 500;">💡 Pro Tip: Early collaborators often become core team members!</p>
      </div>

      <p style="color: #666; line-height: 1.8; text-align: center;">This could be your chance to work on something amazing. Join the project, contribute your skills, and build something incredible together!</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">🔥 Explore & Join Now</a>
      </div>
    `, 'New Project Created')
  }),

  projectMemberAdded: (projectTitle: string, memberName: string): EmailTemplate => ({
    subject: `👥 New Member Joined: ${projectTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Team Member!</h2>
      <p style="color: #666; line-height: 1.6;"><strong>${memberName}</strong> has joined the project:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0;">${projectTitle}</h3>
      </div>
      <p style="color: #666;">Welcome them to the team!</p>
    `, 'New Team Member')
  }),

  projectTaskAdded: (projectTitle: string, taskTitle: string, assignedTo: string): EmailTemplate => ({
    subject: `📋 New Task: ${taskTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Task Assigned!</h2>
      <p style="color: #666; line-height: 1.6;">A new task has been added to your project:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${taskTitle}</h3>
        <p style="color: #888; margin: 0;">Project: ${projectTitle}</p>
        <p style="color: #888; margin: 5px 0 0 0;">Assigned to: ${assignedTo}</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Task</a>
    `, 'New Task')
  }),

  // Task assigned to you notification
  taskAssignedToYou: (projectTitle: string, taskTitle: string, assignedByName: string, priority: string, dueDate?: string): EmailTemplate => ({
    subject: `🎯 You've been assigned a task: ${taskTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Task Assignment!</h2>
      <p style="color: #666; line-height: 1.6;">You have been assigned a new task by <strong>${assignedByName}</strong>:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${taskTitle}</h3>
        <p style="color: #888; margin: 0;">Project: <strong>${projectTitle}</strong></p>
        <p style="color: #888; margin: 5px 0 0 0;">Priority: <span style="color: ${priority === 'high' ? '#e53e3e' : priority === 'medium' ? '#dd6b20' : '#38a169'}; font-weight: bold;">${priority.toUpperCase()}</span></p>
        ${dueDate ? `<p style="color: #888; margin: 5px 0 0 0;">Due Date: <strong>${new Date(dueDate).toLocaleDateString()}</strong></p>` : ''}
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Task</a>
    `, 'Task Assignment')
  }),

  // Task submitted for review notification (for project owner)
  taskSubmittedForReview: (projectTitle: string, taskTitle: string, submitterName: string): EmailTemplate => ({
    subject: `📝 Task Ready for Review: ${taskTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Task Submitted for Review!</h2>
      <p style="color: #666; line-height: 1.6;"><strong>${submitterName}</strong> has submitted a task for your review:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${taskTitle}</h3>
        <p style="color: #888; margin: 0;">Project: <strong>${projectTitle}</strong></p>
        <p style="color: #38a169; margin: 10px 0 0 0; font-weight: bold;">⏳ Awaiting your review</p>
      </div>
      <p style="color: #666; line-height: 1.6;">Please review the task and approve or request changes.</p>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Review Task</a>
    `, 'Task Review')
  }),

  // Idea notifications - Pending review (sent to admins)
  newIdeaPendingReview: (ideaTitle: string, submitterName: string, category: string): EmailTemplate => ({
    subject: `🔔 New Idea Needs Review: ${ideaTitle}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">📝</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">New Idea Submitted for Review</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 25px;">A user has submitted a new idea that needs your approval.</p>

      <div style="background: linear-gradient(135deg, #fff3cd15 0%, #ffc10715 100%); padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 20px;">📌 ${ideaTitle}</h3>
        <div style="margin-top: 15px;">
          <span style="background: #ffc107; color: #333; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px;">📂 ${category}</span>
          <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">👤 by ${submitterName}</span>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #e2e3e515 0%, #cfd9df15 100%); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px dashed #6c757d;">
        <p style="color: #6c757d; margin: 0; font-weight: 500;">⏳ Status: PENDING REVIEW</p>
      </div>

      <p style="color: #666; line-height: 1.8; text-align: center;">Please review this idea and approve or reject it. Approved ideas will be visible to all users in Creator Corner.</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/admin" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">🔍 Review Idea Now</a>
      </div>
    `, 'New Idea Pending Review')
  }),

  // Idea approved (sent to all users)
  newIdea: (ideaTitle: string, submitterName: string, category: string): EmailTemplate => ({
    subject: `💡 Brilliant Idea Alert! Check Out: ${ideaTitle}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">💡</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">A Fresh Idea Just Got Approved!</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 25px;">Innovation is happening right now on SkillUpX!</p>

      <div style="background: linear-gradient(135deg, #ffecd215 0%, #fcb69f15 100%); padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f093fb;">
        <h3 style="color: #f093fb; margin: 0 0 15px 0; font-size: 20px;">✨ ${ideaTitle}</h3>
        <div style="margin-top: 15px;">
          <span style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px;">📂 ${category}</span>
          <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">👤 by ${submitterName}</span>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #d4fc7915 0%, #96e6a115 100%); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px dashed #28a745;">
        <p style="color: #28a745; margin: 0; font-weight: 500;">🎉 This idea has been APPROVED and added to Creator Corner!</p>
      </div>

      <p style="color: #666; line-height: 1.8; text-align: center;">Great ideas need great minds! Check it out, share your thoughts, vote if you love it, or even collaborate to bring it to life!</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);">💫 See This Amazing Idea</a>
      </div>
    `, 'New Idea Approved')
  }),

  ideaStatusUpdate: (ideaTitle: string, newStatus: string, reviewerName: string): EmailTemplate => ({
    subject: `📝 Idea Status Updated: ${ideaTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Idea Status Updated!</h2>
      <p style="color: #666; line-height: 1.6;">Your idea status has been updated:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${ideaTitle}</h3>
        <p style="color: #888; margin: 0;">New Status: <span style="color: ${newStatus === 'approved' ? '#28a745' : newStatus === 'rejected' ? '#dc3545' : '#ffc107'}; font-weight: bold;">${newStatus.toUpperCase()}</span></p>
        <p style="color: #888; margin: 5px 0 0 0;">Reviewed by: ${reviewerName}</p>
      </div>
    `, 'Idea Status Update')
  }),

  // Study Group notifications
  newStudyGroup: (groupName: string, topic: string, creatorName: string): EmailTemplate => ({
    subject: `📚 New Study Group: ${groupName}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Study Group Created!</h2>
      <p style="color: #666; line-height: 1.6;">A new study group is now available:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${groupName}</h3>
        <p style="color: #888; margin: 0;">Topic: ${topic}</p>
        <p style="color: #888; margin: 5px 0 0 0;">Created by: <strong>${creatorName}</strong></p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Join Group</a>
    `, 'New Study Group')
  }),

  studyGroupJoinRequest: (groupName: string, requesterName: string): EmailTemplate => ({
    subject: `🙋 Join Request: ${groupName}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Join Request!</h2>
      <p style="color: #666; line-height: 1.6;">Someone wants to join your study group:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${groupName}</h3>
        <p style="color: #888; margin: 0;">Requester: <strong>${requesterName}</strong></p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Review Request</a>
    `, 'Join Request')
  }),

  studyGroupJoinApproved: (groupName: string): EmailTemplate => ({
    subject: `✅ Join Request Approved: ${groupName}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Welcome to the Group!</h2>
      <p style="color: #666; line-height: 1.6;">Great news! Your join request has been approved:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0;">${groupName}</h3>
      </div>
      <p style="color: #666;">You can now access all group resources and participate in discussions.</p>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Go to Group</a>
    `, 'Join Request Approved')
  }),

  // Marketplace notifications
  newListing: (listingTitle: string, sellerName: string, price: number): EmailTemplate => ({
    subject: `🛍️ New Listing: ${listingTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Marketplace Listing!</h2>
      <p style="color: #666; line-height: 1.6;">A new item is available in the marketplace:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${listingTitle}</h3>
        <p style="color: #888; margin: 0;">Price: <strong>$${price}</strong></p>
        <p style="color: #888; margin: 5px 0 0 0;">Seller: ${sellerName}</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/db" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Listing</a>
    `, 'New Marketplace Listing')
  }),

  newPurchase: (listingTitle: string, buyerName: string, price: number): EmailTemplate => ({
    subject: `💰 New Sale: ${listingTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Congratulations on Your Sale!</h2>
      <p style="color: #666; line-height: 1.6;">Someone purchased your listing:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${listingTitle}</h3>
        <p style="color: #888; margin: 0;">Amount: <strong>$${price}</strong></p>
        <p style="color: #888; margin: 5px 0 0 0;">Buyer: ${buyerName}</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/db" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Sales</a>
    `, 'New Sale')
  }),

  purchaseConfirmation: (listingTitle: string, sellerName: string, price: number): EmailTemplate => ({
    subject: `🎉 Purchase Confirmed: ${listingTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Purchase Successful!</h2>
      <p style="color: #666; line-height: 1.6;">Your purchase has been confirmed:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${listingTitle}</h3>
        <p style="color: #888; margin: 0;">Amount Paid: <strong>$${price}</strong></p>
        <p style="color: #888; margin: 5px 0 0 0;">Seller: ${sellerName}</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/db" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Purchases</a>
    `, 'Purchase Confirmed')
  }),

  newReview: (listingTitle: string, reviewerName: string, rating: number): EmailTemplate => ({
    subject: `⭐ New Review on: ${listingTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">You Got a New Review!</h2>
      <p style="color: #666; line-height: 1.6;">Someone left a review on your listing:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${listingTitle}</h3>
        <p style="color: #888; margin: 0;">Rating: ${'⭐'.repeat(rating)}</p>
        <p style="color: #888; margin: 5px 0 0 0;">Reviewer: ${reviewerName}</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/marketplace" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Review</a>
    `, 'New Review')
  }),

  // Battle notifications
  battleWaiting: (challengerName: string, difficulty: string, prize: number): EmailTemplate => ({
    subject: `⚔️ ${challengerName} is Waiting for a Battle Opponent!`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">⚔️</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">Battle Arena Alert!</h2>
      <p style="color: #dc3545; text-align: center; font-size: 14px; margin-bottom: 25px; font-weight: bold;">🔴 LIVE - Someone is waiting for you!</p>

      <div style="background: linear-gradient(135deg, #ff416c15 0%, #ff4b2b15 100%); padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ff416c;">
        <h3 style="color: #ff416c; margin: 0 0 15px 0; font-size: 20px;">🎮 ${challengerName} wants to battle!</h3>
        <div style="margin-top: 15px;">
          <span style="background: ${difficulty === 'easy' ? '#28a745' : difficulty === 'medium' ? '#ffc107' : '#dc3545'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px;">📊 ${difficulty.toUpperCase()}</span>
          <span style="background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%); color: #333; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">🏆 ${prize} coins prize</span>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #11998e15 0%, #38ef7d15 100%); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px dashed #28a745;">
        <p style="color: #28a745; margin: 0; font-weight: 500;">⏰ Join now before someone else takes this spot!</p>
      </div>

      <p style="color: #666; line-height: 1.8; text-align: center;">Test your coding skills in a real-time battle! Solve the challenge faster than your opponent and win the prize pool!</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/codearena" style="display: inline-block; background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4);">⚔️ Join Battle Now!</a>
      </div>
    `, 'Battle Waiting')
  }),

  battleInvite: (challengerName: string, difficulty: string, prize: number): EmailTemplate => ({
    subject: `⚔️ Battle Challenge from ${challengerName}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">You've Been Challenged!</h2>
      <p style="color: #666; line-height: 1.6;"><strong>${challengerName}</strong> wants to battle you:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #888; margin: 0;">Difficulty: <strong>${difficulty}</strong></p>
        <p style="color: #888; margin: 5px 0 0 0;">Prize: <strong>${prize} coins</strong></p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/codearena" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Accept Challenge</a>
    `, 'Battle Challenge')
  }),

  battleResult: (opponentName: string, result: 'won' | 'lost', prize: number): EmailTemplate => ({
    subject: `🏆 Battle ${result === 'won' ? 'Victory' : 'Result'}: vs ${opponentName}`,
    html: getEmailWrapper(`
      <h2 style="color: ${result === 'won' ? '#28a745' : '#dc3545'}; margin-bottom: 20px;">
        ${result === 'won' ? '🎉 Congratulations! You Won!' : '😔 Battle Complete'}
      </h2>
      <p style="color: #666; line-height: 1.6;">Your battle against <strong>${opponentName}</strong> has ended.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #888; margin: 0;">Result: <strong style="color: ${result === 'won' ? '#28a745' : '#dc3545'};">${result.toUpperCase()}</strong></p>
        ${result === 'won' ? `<p style="color: #888; margin: 5px 0 0 0;">Prize: <strong>${prize} coins</strong></p>` : ''}
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/codearena" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Battles</a>
    `, 'Battle Result')
  }),

  // Challenge notifications
  newChallenge: (challengeTitle: string, difficulty: string, points: number): EmailTemplate => ({
    subject: `🎯 New Challenge Available: ${challengeTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Challenge!</h2>
      <p style="color: #666; line-height: 1.6;">A new coding challenge is now available:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${challengeTitle}</h3>
        <p style="color: #888; margin: 0;">Difficulty: <strong>${difficulty}</strong></p>
        <p style="color: #888; margin: 5px 0 0 0;">Points: <strong>${points}</strong></p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/practice" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Solve Challenge</a>
    `, 'New Challenge')
  }),

  // Message notifications - Direct Messages
  newMessage: (senderName: string, preview: string): EmailTemplate => ({
    subject: `💬 New Message from ${senderName}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Direct Message!</h2>
      <p style="color: #666; line-height: 1.6;">You have a new message from <strong>${senderName}</strong>:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
        <p style="color: #666; margin: 0; font-style: italic;">"${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}"</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Reply Now</a>
    `, 'New Message')
  }),

  // Developer Connect Chat
  newDeveloperConnectMessage: (senderName: string, preview: string): EmailTemplate => ({
    subject: `🔗 Developer Connect: Message from ${senderName}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🔗</span>
      </div>
      <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Developer Connect Message</h2>
      <p style="color: #666; line-height: 1.6; text-align: center;"><strong>${senderName}</strong> sent you a message:</p>
      <div style="background: linear-gradient(135deg, #00ADB515 0%, #00d4ff15 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00ADB5;">
        <p style="color: #666; margin: 0; font-style: italic;">"${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}"</p>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Continue Chat</a>
      </div>
    `, 'Developer Connect')
  }),

  // Marketplace Chat
  newMarketplaceMessage: (senderName: string, preview: string): EmailTemplate => ({
    subject: `🛒 Marketplace: Message from ${senderName}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🛒</span>
      </div>
      <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Marketplace Message</h2>
      <p style="color: #666; line-height: 1.6; text-align: center;"><strong>${senderName}</strong> is interested in your listing:</p>
      <div style="background: linear-gradient(135deg, #f59e0b15 0%, #fbbf2415 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #666; margin: 0; font-style: italic;">"${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}"</p>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/db" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Conversation</a>
      </div>
    `, 'Marketplace Chat')
  }),

  // Study Group Chat
  newStudyGroupMessage: (senderName: string, groupName: string, preview: string): EmailTemplate => ({
    subject: `📚 ${groupName}: New message from ${senderName}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">📚</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center;">Study Group Message</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 20px;">${groupName}</p>
      <p style="color: #666; line-height: 1.6; text-align: center;"><strong>${senderName}</strong> posted:</p>
      <div style="background: linear-gradient(135deg, #10b98115 0%, #34d39915 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <p style="color: #666; margin: 0; font-style: italic;">"${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}"</p>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Join Discussion</a>
      </div>
    `, 'Study Group')
  }),

  // Project Team Chat
  newProjectMessage: (senderName: string, projectTitle: string, preview: string): EmailTemplate => ({
    subject: `🚀 ${projectTitle}: Message from ${senderName}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🚀</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center;">Project Team Message</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 20px;">${projectTitle}</p>
      <p style="color: #666; line-height: 1.6; text-align: center;"><strong>${senderName}</strong> says:</p>
      <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
        <p style="color: #666; margin: 0; font-style: italic;">"${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}"</p>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Open Project Chat</a>
      </div>
    `, 'Project Chat')
  }),

  // Project Invite notification
  projectInvite: (projectTitle: string, inviterName: string, personalMessage: string, inviteLink: string): EmailTemplate => ({
    subject: `🎉 You're Invited to Join: ${projectTitle}`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">🎉</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">Project Invitation!</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 25px;">You've been personally invited to collaborate!</p>

      <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #667eea;">
        <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 20px;">📌 ${projectTitle}</h3>
        <div style="display: flex; align-items: center; margin-top: 10px;">
          <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">👤 Invited by ${inviterName}</span>
        </div>
      </div>

      ${personalMessage ? `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00ADB5;">
        <p style="color: #666; margin: 0; font-style: italic;">"${personalMessage}"</p>
        <p style="color: #888; margin: 10px 0 0 0; font-size: 12px;">— ${inviterName}</p>
      </div>
      ` : ''}

      <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="color: #155724; margin: 0; font-weight: 500;">💡 Click the button below to join the project instantly!</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 173, 181, 0.4);">🚀 Join Project Now</a>
      </div>

      <p style="color: #888; text-align: center; margin-top: 20px; font-size: 12px;">This invite link expires in 7 days.</p>
    `, 'Project Invitation')
  }),

  // Join Request notifications
  newJoinRequest: (projectTitle: string, requesterName: string): EmailTemplate => ({
    subject: `🙋 Join Request for: ${projectTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">New Join Request!</h2>
      <p style="color: #666; line-height: 1.6;"><strong>${requesterName}</strong> wants to join your project:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0;">${projectTitle}</h3>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Review Request</a>
    `, 'Join Request')
  }),

  joinRequestApproved: (projectTitle: string): EmailTemplate => ({
    subject: `✅ Join Request Approved: ${projectTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Welcome to the Team!</h2>
      <p style="color: #666; line-height: 1.6;">Your join request has been approved:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0;">${projectTitle}</h3>
      </div>
      <p style="color: #666;">You can now access the project and collaborate with the team!</p>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Go to Project</a>
    `, 'Join Request Approved')
  }),

  joinRequestRejected: (projectTitle: string): EmailTemplate => ({
    subject: `❌ Join Request Declined: ${projectTitle}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Request Update</h2>
      <p style="color: #666; line-height: 1.6;">Unfortunately, your join request was not approved:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0;">${projectTitle}</h3>
      </div>
      <p style="color: #666;">Don't worry! There are plenty of other projects to explore.</p>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Browse Projects</a>
    `, 'Join Request Declined')
  }),

  // Help Request notifications
  newHelpRequest: (title: string, category: string, requesterName: string): EmailTemplate => ({
    subject: `New Help Request: ${title}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">Someone Needs Help!</h2>
      <p style="color: #666; line-height: 1.6;">A new help request has been posted:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">${title}</h3>
        <p style="color: #888; margin: 0;">Category: ${category}</p>
        <p style="color: #888; margin: 5px 0 0 0;">Requested by: <strong>${requesterName}</strong></p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'https://skillupx.vercel.app'}/dashboard/developer-connect" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Help Out</a>
    `, 'New Help Request')
  }),

  // Endorsement notification
  newEndorsement: (endorserName: string, skill: string): EmailTemplate => ({
    subject: `👍 ${endorserName} endorsed your skill: ${skill}`,
    html: getEmailWrapper(`
      <h2 style="color: #333; margin-bottom: 20px;">You Got Endorsed!</h2>
      <p style="color: #666; line-height: 1.6;"><strong>${endorserName}</strong> endorsed your skill:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">${skill}</span>
      </div>
      <p style="color: #666;">Keep up the great work!</p>
    `, 'New Endorsement')
  }),

  // OTP for email verification (signup)
  signupOTP: (name: string, otp: string): EmailTemplate => ({
    subject: `🔐 Verify Your Email - SkillUpX`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">🔐</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">Welcome to SkillUpX!</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 25px;">Please verify your email to get started</p>

      <p style="color: #666; line-height: 1.6; text-align: center;">Hi <strong>${name}</strong>,</p>
      <p style="color: #666; line-height: 1.6; text-align: center;">Use the following OTP to verify your email address:</p>

      <div style="background: linear-gradient(135deg, #00ADB5 0%, #059ca7 100%); padding: 25px 40px; border-radius: 12px; margin: 30px auto; text-align: center; max-width: 200px;">
        <span style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
      </div>

      <p style="color: #666; text-align: center; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>.</p>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #ffc107;">
        <p style="color: #856404; margin: 0; font-weight: 500;">⚠️ If you didn't request this verification, please ignore this email.</p>
      </div>
    `, 'Email Verification')
  }),

  // OTP for password reset
  passwordResetOTP: (name: string, otp: string): EmailTemplate => ({
    subject: `🔑 Password Reset OTP - SkillUpX`,
    html: getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 60px;">🔑</span>
      </div>
      <h2 style="color: #333; margin-bottom: 10px; text-align: center; font-size: 24px;">Password Reset Request</h2>
      <p style="color: #667eea; text-align: center; font-size: 14px; margin-bottom: 25px;">We received a request to reset your password</p>

      <p style="color: #666; line-height: 1.6; text-align: center;">Hi <strong>${name}</strong>,</p>
      <p style="color: #666; line-height: 1.6; text-align: center;">Use the following OTP to reset your password:</p>

      <div style="background: linear-gradient(135deg, #00ADB5 0%, #059ca7 100%); padding: 25px 40px; border-radius: 12px; margin: 30px auto; text-align: center; max-width: 200px;">
        <span style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
      </div>

      <p style="color: #666; text-align: center; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>.</p>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #ffc107;">
        <p style="color: #856404; margin: 0; font-weight: 500;">⚠️ If you didn't request this password reset, please ignore this email or contact support.</p>
      </div>
    `, 'Password Reset')
  })
};

// Main email sending function using Brevo HTTP API
// (SMTP is blocked on Render, so we use HTTP API instead)
export const sendEmail = async (
  to: string,
  template: EmailTemplate
): Promise<boolean> => {
  // Skip if Brevo API key is not configured
  if (!process.env.BREVO_API_KEY) {
    console.log('📧 Brevo API key not configured, skipping notification');
    return false;
  }

  const senderEmail = process.env.BREVO_EMAIL || 'noreply@skillupx.com';

  try {
    console.log(`📧 Attempting to send email via Brevo API to: ${to}`);
    console.log(`📧 From: ${senderEmail}`);
    console.log(`📧 Subject: ${template.subject}`);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'SkillUpX',
          email: senderEmail
        },
        to: [{ email: to }],
        subject: template.subject,
        htmlContent: template.html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('📧 Brevo API error:', errorData);
      return false;
    }

    const result = await response.json() as { messageId?: string };
    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`📧 Message ID: ${result.messageId || 'N/A'}`);
    return true;
  } catch (error: any) {
    console.error('📧 Email sending failed:', error.message || error);
    return false;
  }
};

// Bulk email sending function
export const sendBulkEmail = async (
  recipients: string[],
  template: EmailTemplate
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const email of recipients) {
    const result = await sendEmail(email, template);
    if (result) success++;
    else failed++;
  }

  return { success, failed };
};

// Email notification helper functions for each feature
export const emailNotifications = {
  // Project notifications
  notifyNewProject: async (projectTitle: string, creatorName: string, recipientEmails: string[]) => {
    const template = emailTemplates.newProject(projectTitle, creatorName);
    return sendBulkEmail(recipientEmails, template);
  },

  notifyProjectMemberAdded: async (projectTitle: string, memberName: string, recipientEmails: string[]) => {
    const template = emailTemplates.projectMemberAdded(projectTitle, memberName);
    return sendBulkEmail(recipientEmails, template);
  },

  notifyProjectTaskAdded: async (projectTitle: string, taskTitle: string, assignedTo: string, recipientEmail: string) => {
    const template = emailTemplates.projectTaskAdded(projectTitle, taskTitle, assignedTo);
    return sendEmail(recipientEmail, template);
  },

  // Idea notifications - Pending review (sent to admins when idea is submitted)
  notifyNewIdeaPendingReview: async (ideaTitle: string, submitterName: string, category: string, adminEmails: string[]) => {
    const template = emailTemplates.newIdeaPendingReview(ideaTitle, submitterName, category);
    return sendBulkEmail(adminEmails, template);
  },

  // Idea approved (sent to all users when idea is approved)
  notifyNewIdea: async (ideaTitle: string, submitterName: string, category: string, userEmails: string[]) => {
    const template = emailTemplates.newIdea(ideaTitle, submitterName, category);
    return sendBulkEmail(userEmails, template);
  },

  notifyIdeaStatusUpdate: async (ideaTitle: string, newStatus: string, reviewerName: string, submitterEmail: string) => {
    const template = emailTemplates.ideaStatusUpdate(ideaTitle, newStatus, reviewerName);
    return sendEmail(submitterEmail, template);
  },

  // Study Group notifications
  notifyNewStudyGroup: async (groupName: string, topic: string, creatorName: string, recipientEmails: string[]) => {
    const template = emailTemplates.newStudyGroup(groupName, topic, creatorName);
    return sendBulkEmail(recipientEmails, template);
  },

  notifyStudyGroupJoinRequest: async (groupName: string, requesterName: string, adminEmail: string) => {
    const template = emailTemplates.studyGroupJoinRequest(groupName, requesterName);
    return sendEmail(adminEmail, template);
  },

  notifyStudyGroupJoinApproved: async (groupName: string, memberEmail: string) => {
    const template = emailTemplates.studyGroupJoinApproved(groupName);
    return sendEmail(memberEmail, template);
  },

  // Marketplace notifications
  notifyNewListing: async (listingTitle: string, sellerName: string, price: number, recipientEmails: string[]) => {
    const template = emailTemplates.newListing(listingTitle, sellerName, price);
    return sendBulkEmail(recipientEmails, template);
  },

  notifyNewPurchase: async (listingTitle: string, buyerName: string, price: number, sellerEmail: string) => {
    const template = emailTemplates.newPurchase(listingTitle, buyerName, price);
    return sendEmail(sellerEmail, template);
  },

  notifyPurchaseConfirmation: async (listingTitle: string, sellerName: string, price: number, buyerEmail: string) => {
    const template = emailTemplates.purchaseConfirmation(listingTitle, sellerName, price);
    return sendEmail(buyerEmail, template);
  },

  notifyNewReview: async (listingTitle: string, reviewerName: string, rating: number, sellerEmail: string) => {
    const template = emailTemplates.newReview(listingTitle, reviewerName, rating);
    return sendEmail(sellerEmail, template);
  },

  // Battle notifications
  notifyBattleWaiting: async (challengerName: string, difficulty: string, prize: number, recipientEmails: string[]) => {
    const template = emailTemplates.battleWaiting(challengerName, difficulty, prize);
    return sendBulkEmail(recipientEmails, template);
  },

  notifyBattleInvite: async (challengerName: string, difficulty: string, prize: number, opponentEmail: string) => {
    const template = emailTemplates.battleInvite(challengerName, difficulty, prize);
    return sendEmail(opponentEmail, template);
  },

  notifyBattleResult: async (opponentName: string, result: 'won' | 'lost', prize: number, playerEmail: string) => {
    const template = emailTemplates.battleResult(opponentName, result, prize);
    return sendEmail(playerEmail, template);
  },

  // Challenge notifications
  notifyNewChallenge: async (challengeTitle: string, difficulty: string, points: number, recipientEmails: string[]) => {
    const template = emailTemplates.newChallenge(challengeTitle, difficulty, points);
    return sendBulkEmail(recipientEmails, template);
  },

  // Message notifications - Direct Messages
  notifyNewMessage: async (senderName: string, preview: string, recipientEmail: string) => {
    const template = emailTemplates.newMessage(senderName, preview);
    return sendEmail(recipientEmail, template);
  },

  // Developer Connect Chat
  notifyDeveloperConnectMessage: async (senderName: string, preview: string, recipientEmail: string) => {
    const template = emailTemplates.newDeveloperConnectMessage(senderName, preview);
    return sendEmail(recipientEmail, template);
  },

  // Marketplace Chat
  notifyMarketplaceMessage: async (senderName: string, preview: string, recipientEmail: string) => {
    const template = emailTemplates.newMarketplaceMessage(senderName, preview);
    return sendEmail(recipientEmail, template);
  },

  // Study Group Chat
  notifyStudyGroupMessage: async (senderName: string, groupName: string, preview: string, recipientEmail: string) => {
    const template = emailTemplates.newStudyGroupMessage(senderName, groupName, preview);
    return sendEmail(recipientEmail, template);
  },

  // Project Team Chat
  notifyProjectMessage: async (senderName: string, projectTitle: string, preview: string, recipientEmail: string) => {
    const template = emailTemplates.newProjectMessage(senderName, projectTitle, preview);
    return sendEmail(recipientEmail, template);
  },

  // Project Invite notification
  notifyProjectInvite: async (projectTitle: string, inviterName: string, personalMessage: string, inviteLink: string, recipientEmail: string) => {
    const template = emailTemplates.projectInvite(projectTitle, inviterName, personalMessage, inviteLink);
    return sendEmail(recipientEmail, template);
  },

  // Join Request notifications
  notifyNewJoinRequest: async (projectTitle: string, requesterName: string, ownerEmail: string) => {
    const template = emailTemplates.newJoinRequest(projectTitle, requesterName);
    return sendEmail(ownerEmail, template);
  },

  notifyJoinRequestApproved: async (projectTitle: string, memberEmail: string) => {
    const template = emailTemplates.joinRequestApproved(projectTitle);
    return sendEmail(memberEmail, template);
  },

  notifyJoinRequestRejected: async (projectTitle: string, memberEmail: string) => {
    const template = emailTemplates.joinRequestRejected(projectTitle);
    return sendEmail(memberEmail, template);
  },

  // Help Request notifications
  notifyNewHelpRequest: async (title: string, category: string, requesterName: string, recipientEmails: string[]) => {
    const template = emailTemplates.newHelpRequest(title, category, requesterName);
    return sendBulkEmail(recipientEmails, template);
  },

  // Endorsement notification
  notifyNewEndorsement: async (endorserName: string, skill: string, recipientEmail: string) => {
    const template = emailTemplates.newEndorsement(endorserName, skill);
    return sendEmail(recipientEmail, template);
  },

  // Task assignment notification (sent to assignee when task is assigned)
  notifyTaskAssigned: async (projectTitle: string, taskTitle: string, assignedByName: string, priority: string, dueDate: string | undefined, assigneeEmail: string) => {
    const template = emailTemplates.taskAssignedToYou(projectTitle, taskTitle, assignedByName, priority, dueDate);
    return sendEmail(assigneeEmail, template);
  },

  // Task submitted for review notification (sent to project owner)
  notifyTaskSubmittedForReview: async (projectTitle: string, taskTitle: string, submitterName: string, ownerEmail: string) => {
    const template = emailTemplates.taskSubmittedForReview(projectTitle, taskTitle, submitterName);
    return sendEmail(ownerEmail, template);
  }
};

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP for email verification (signup)
export async function sendSignupOTP(email: string, otp: string, name: string): Promise<boolean> {
  const template = emailTemplates.signupOTP(name, otp);
  return sendEmail(email, template);
}

// Send OTP for password reset
export async function sendPasswordResetOTP(email: string, otp: string, name: string): Promise<boolean> {
  const template = emailTemplates.passwordResetOTP(name, otp);
  return sendEmail(email, template);
}

export default emailNotifications;
