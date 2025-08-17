const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailService = {
  // Load and compile email templates
  loadTemplate: (templateName) => {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.hbs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      return handlebars.compile(templateContent);
    } catch (error) {
      console.error(`Error loading email template ${templateName}:`, error);
      return null;
    }
  },

  // Send email with template
  sendEmail: async (to, subject, templateName, templateData = {}) => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not configured. Email not sent.');
        return { success: false, message: 'Email service not configured' };
      }

      const template = emailService.loadTemplate(templateName);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      const html = template(templateData);

      const msg = {
        to: to,
        from: process.env.FROM_EMAIL,
        subject: subject,
        html: html
      };

      const response = await sgMail.send(msg);
      console.log(`Email sent to ${to}: ${subject}`);
      return { success: true, response };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send auction won notification
  sendAuctionWonEmail: async (winner, auction, highestBid) => {
    const subject = `Congratulations! You won the auction for "${auction.title}"`;
    const templateData = {
      winnerName: `${winner.firstName} ${winner.lastName}`,
      auctionTitle: auction.title,
      winningBid: highestBid,
      auctionId: auction.id,
      sellerName: auction.seller ? `${auction.seller.firstName} ${auction.seller.lastName}` : 'Unknown'
    };

    return await emailService.sendEmail(winner.email, subject, 'auction-won', templateData);
  },

  // Send bid accepted notification
  sendBidAcceptedEmail: async (winner, seller, auction, finalAmount) => {
    // Email to winner
    const winnerSubject = `Your bid has been accepted for "${auction.title}"`;
    const winnerTemplateData = {
      buyerName: `${winner.firstName} ${winner.lastName}`,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      auctionTitle: auction.title,
      finalAmount: finalAmount,
      auctionId: auction.id
    };

    // Email to seller
    const sellerSubject = `You accepted the bid for "${auction.title}"`;
    const sellerTemplateData = {
      sellerName: `${seller.firstName} ${seller.lastName}`,
      buyerName: `${winner.firstName} ${winner.lastName}`,
      auctionTitle: auction.title,
      finalAmount: finalAmount,
      auctionId: auction.id
    };

    const results = await Promise.all([
      emailService.sendEmail(winner.email, winnerSubject, 'bid-accepted-buyer', winnerTemplateData),
      emailService.sendEmail(seller.email, sellerSubject, 'bid-accepted-seller', sellerTemplateData)
    ]);

    return {
      winnerEmail: results[0],
      sellerEmail: results[1]
    };
  },

  // Send bid rejected notification
  sendBidRejectedEmail: async (winner, seller, auction, rejectedAmount) => {
    const subject = `Your bid has been rejected for "${auction.title}"`;
    const templateData = {
      buyerName: `${winner.firstName} ${winner.lastName}`,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      auctionTitle: auction.title,
      rejectedAmount: rejectedAmount,
      auctionId: auction.id
    };

    return await emailService.sendEmail(winner.email, subject, 'bid-rejected', templateData);
  },

  // Send counter offer notification
  sendCounterOfferEmail: async (winner, seller, auction, originalBid, counterOfferAmount) => {
    const subject = `Counter offer received for "${auction.title}"`;
    const templateData = {
      buyerName: `${winner.firstName} ${winner.lastName}`,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      auctionTitle: auction.title,
      originalBid: originalBid,
      counterOfferAmount: counterOfferAmount,
      auctionId: auction.id
    };

    return await emailService.sendEmail(winner.email, subject, 'counter-offer', templateData);
  },

  // Send counter offer response notification
  sendCounterOfferResponseEmail: async (seller, winner, auction, counterOfferAmount, response) => {
    const subject = `Counter offer ${response} for "${auction.title}"`;
    const templateData = {
      sellerName: `${seller.firstName} ${seller.lastName}`,
      buyerName: `${winner.firstName} ${winner.lastName}`,
      auctionTitle: auction.title,
      counterOfferAmount: counterOfferAmount,
      response: response,
      auctionId: auction.id
    };

    return await emailService.sendEmail(seller.email, subject, 'counter-offer-response', templateData);
  },

  // Send transaction confirmation email
  sendTransactionConfirmationEmail: async (buyer, seller, auction, finalAmount) => {
    // Email to buyer
    const buyerSubject = `Transaction Confirmation - "${auction.title}"`;
    const buyerTemplateData = {
      buyerName: `${buyer.firstName} ${buyer.lastName}`,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      sellerEmail: seller.email,
      auctionTitle: auction.title,
      finalAmount: finalAmount,
      auctionId: auction.id,
      transactionDate: new Date().toLocaleDateString()
    };

    // Email to seller
    const sellerSubject = `Transaction Confirmation - "${auction.title}"`;
    const sellerTemplateData = {
      sellerName: `${seller.firstName} ${seller.lastName}`,
      buyerName: `${buyer.firstName} ${buyer.lastName}`,
      buyerEmail: buyer.email,
      auctionTitle: auction.title,
      finalAmount: finalAmount,
      auctionId: auction.id,
      transactionDate: new Date().toLocaleDateString()
    };

    const results = await Promise.all([
      emailService.sendEmail(buyer.email, buyerSubject, 'transaction-confirmation-buyer', buyerTemplateData),
      emailService.sendEmail(seller.email, sellerSubject, 'transaction-confirmation-seller', sellerTemplateData)
    ]);

    return {
      buyerEmail: results[0],
      sellerEmail: results[1]
    };
  }
};

module.exports = emailService;
