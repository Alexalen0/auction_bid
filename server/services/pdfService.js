const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

const pdfService = {
  // Generate invoice PDF
  generateInvoice: async (buyer, seller, auction, finalAmount, invoiceNumber) => {
    try {
      // Load invoice template
      const templatePath = path.join(__dirname, '../templates/pdf/invoice.hbs');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: invoiceNumber || `INV-${auction.id}-${Date.now()}`,
        invoiceDate: new Date().toLocaleDateString(),
        
        // Buyer information
        buyer: {
          name: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email,
          id: buyer.id
        },
        
        // Seller information
        seller: {
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.email,
          id: seller.id
        },
        
        // Auction information
        auction: {
          id: auction.id,
          title: auction.title,
          description: auction.description,
          startingPrice: parseFloat(auction.startingPrice).toFixed(2),
          finalAmount: parseFloat(finalAmount).toFixed(2)
        },
        
        // Transaction details
        transaction: {
          subtotal: parseFloat(finalAmount).toFixed(2),
          platformFee: (parseFloat(finalAmount) * 0.05).toFixed(2), // 5% platform fee
          total: (parseFloat(finalAmount) * 1.05).toFixed(2)
        },
        
        // Company information
        company: {
          name: 'AuctionBid Platform',
          address: '123 Auction Street, Bid City, BC 12345',
          email: 'support@auctionbid.com',
          phone: '+1 (555) 123-4567'
        }
      };

      // Generate HTML from template
      const html = template(invoiceData);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set HTML content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await browser.close();

      return {
        success: true,
        pdfBuffer,
        invoiceNumber: invoiceData.invoiceNumber,
        filename: `invoice-${invoiceData.invoiceNumber}.pdf`
      };

    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Generate and save invoice
  generateAndSaveInvoice: async (buyer, seller, auction, finalAmount) => {
    try {
      const result = await pdfService.generateInvoice(buyer, seller, auction, finalAmount);
      
      if (!result.success) {
        return result;
      }

      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '../invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Save PDF to file
      const filePath = path.join(invoicesDir, result.filename);
      fs.writeFileSync(filePath, result.pdfBuffer);

      return {
        success: true,
        filePath,
        filename: result.filename,
        invoiceNumber: result.invoiceNumber,
        pdfBuffer: result.pdfBuffer
      };

    } catch (error) {
      console.error('PDF save error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = pdfService;
