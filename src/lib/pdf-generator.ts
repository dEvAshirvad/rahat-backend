import PDFDocument from 'pdfkit';
import { Case } from '@/modules/cases/cases.model';

export class PDFGenerator {
  /**
   * Generate a government-style case document PDF
   */
  static generateCasePDF(caseData: Case): any {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Case Report - ${caseData.caseId}`,
        Author: 'Project Rahat - Government of Chhattisgarh',
        Subject: 'Revenue Book Circular (RBC) 6(4) Case Report',
        Creator: 'Project Rahat Backend System',
        CreationDate: new Date(),
      },
    });

    // Set up fonts and colors
    const primaryColor = '#1a365d'; // Government blue
    const secondaryColor = '#2d3748'; // Dark gray
    const accentColor = '#e53e3e'; // Red for important info
    const borderColor = '#cbd5e0'; // Light gray for borders

    // Header with Government Logo and Title
    this.addHeader(doc, caseData.caseId, primaryColor);

    // Official Government Styling
    this.addGovernmentStyling(doc, primaryColor, secondaryColor);

    // Case Information Section
    this.addCaseInformation(doc, caseData, primaryColor, secondaryColor);

    // Victim Details Section
    this.addVictimDetails(doc, caseData, primaryColor, secondaryColor);

    // Case Status and Progress
    this.addCaseStatus(doc, caseData, primaryColor, accentColor);

    // Official Footer
    this.addFooter(doc, primaryColor, secondaryColor);

    return doc;
  }

  private static addHeader(doc: any, caseId: string, primaryColor: string) {
    // Government header with official styling
    doc
      .fontSize(24)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('GOVERNMENT OF CHHATTISGARH', { align: 'center' })
      .moveDown(0.5);

    doc.fontSize(18).text('PROJECT RAHAT', { align: 'center' }).moveDown(0.5);

    doc
      .fontSize(14)
      .text('Revenue Book Circular (RBC) 6(4)', { align: 'center' })
      .moveDown(1);

    // Case ID with official styling
    doc
      .fontSize(16)
      .fillColor('#e53e3e')
      .text(`CASE ID: ${caseId}`, { align: 'center' })
      .moveDown(1);

    // Separator line
    doc
      .strokeColor('#cbd5e0')
      .lineWidth(2)
      .moveTo(40, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(1);
  }

  private static addGovernmentStyling(
    doc: any,
    primaryColor: string,
    secondaryColor: string
  ) {
    // Add official document styling
    doc
      .fontSize(10)
      .fillColor(secondaryColor)
      .text('This is an official document of the Government of Chhattisgarh', {
        align: 'center',
      })
      .moveDown(0.5);

    doc
      .text('Generated on: ' + new Date().toLocaleDateString('en-IN'), {
        align: 'center',
      })
      .moveDown(1);
  }

  private static addCaseInformation(
    doc: any,
    caseData: Case,
    primaryColor: string,
    secondaryColor: string
  ) {
    // Section header
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('CASE INFORMATION', { underline: true })
      .moveDown(0.5);

    // Case details in table format
    const caseInfo = [
      ['Case ID:', caseData.caseId],
      ['Status:', this.formatStatus(caseData.status)],
      ['Stage:', `Stage ${caseData.stage} of 8`],
      ['Created:', caseData.createdAt.toLocaleDateString('en-IN')],
      ['Last Updated:', caseData.updatedAt.toLocaleDateString('en-IN')],
    ];

    this.addTable(doc, caseInfo, primaryColor, secondaryColor);
    doc.moveDown(1);
  }

  private static addVictimDetails(
    doc: any,
    caseData: Case,
    primaryColor: string,
    secondaryColor: string
  ) {
    // Section header
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('VICTIM DETAILS', { underline: true })
      .moveDown(0.5);

    // Victim information in table format
    const victimInfo = [
      ['Full Name:', caseData.victim.name],
      ['Date of Birth:', caseData.victim.dob.toLocaleDateString('en-IN')],
      ['Date of Death:', caseData.victim.dod.toLocaleDateString('en-IN')],
      [
        'Age at Death:',
        this.calculateAge(caseData.victim.dob, caseData.victim.dod) + ' years',
      ],
      ['Address:', caseData.victim.address],
      ['Contact:', caseData.victim.contact],
      ['Description:', caseData.victim.description],
    ];

    this.addTable(doc, victimInfo, primaryColor, secondaryColor);
    doc.moveDown(1);
  }

  private static addCaseStatus(
    doc: any,
    caseData: Case,
    primaryColor: string,
    accentColor: string
  ) {
    const secondaryColor = '#2d3748'; // define here for use
    // Section header
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('CASE STATUS', { underline: true })
      .moveDown(0.5);

    // Status information in table format
    const statusInfo = [
      ['Current Status:', this.formatStatus(caseData.status)],
      ['Current Stage:', `Stage ${caseData.stage} of 8`],
    ];

    this.addTable(doc, statusInfo, primaryColor, secondaryColor);
    doc.moveDown(1);

    // // Add remarks if any
    // if (caseData.remarks && caseData.remarks.length > 0) {
    //   doc
    //     .fontSize(12)
    //     .fillColor(primaryColor)
    //     .font('Helvetica-Bold')
    //     .text('REMARKS & COMMENTS', { underline: true })
    //     .moveDown(0.5);

    //   caseData.remarks.forEach((remark, index) => {
    //     doc
    //       .fontSize(10)
    //       .fillColor(secondaryColor || '#2d3748')
    //       .font('Helvetica')
    //       .text(
    //         `Stage ${remark.stage} - ${remark.date.toLocaleDateString('en-IN')}:`,
    //         { continued: true }
    //       )
    //       .moveDown(0.2)
    //       .text(remark.remark)
    //       .moveDown(0.3);
    //   });
    // }
  }

  private static addFooter(
    doc: any,
    primaryColor: string,
    secondaryColor: string
  ) {
    // Footer at the very bottom of the page
    const pageHeight = doc.page.height;

    // Footer line at bottom
    doc
      .strokeColor('#cbd5e0')
      .lineWidth(1)
      .moveTo(40, pageHeight - 40)
      .lineTo(550, pageHeight - 40)
      .stroke();

    // // Footer text at the very bottom
    // doc
    //   .fontSize(8)
    //   .fillColor(secondaryColor)
    //   .text('Project Rahat - Government of Chhattisgarh', {
    //     align: 'center',
    //     y: pageHeight - 40,
    //   });
  }

  private static addTable(
    doc: any,
    data: string[][],
    primaryColor: string,
    secondaryColor: string
  ) {
    const startX = 60;
    const startY = doc.y;
    const colWidth = 200;
    const rowHeight = 20;

    data.forEach((row, index) => {
      const y = startY + index * rowHeight;

      // Label (left column)
      doc
        .fontSize(10)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(row[0], startX, y);

      // Value (right column)
      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .font('Helvetica')
        .text(row[1], startX + colWidth, y, {
          width: 280,
          align: 'left',
        });
    });

    doc.y = startY + data.length * rowHeight + 10;
  }

  private static formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      created: 'Created',
      pendingSDM: 'Pending SDM Review',
      pendingRahatShakha: 'Pending Rahat Shakha Review',
      pendingOIC: 'Pending OIC Review',
      pendingAdditionalCollector: 'Pending Additional Collector Review',
      pendingCollector: 'Pending Collector Review',
      pendingAdditionalCollector2: 'Pending Additional Collector 2 Review',
      pendingTehsildar: 'Pending Tehsildar Closure',
      closed: 'Closed',
      rejected: 'Rejected',
    };
    return statusMap[status] || status;
  }

  private static calculateAge(dob: Date, dod: Date): number {
    const ageDifMs = dod.getTime() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  /**
   * Generate final case PDF with payment details and closure information
   */
  static generateFinalCasePDF(caseData: Case): any {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Final Case Report - ${caseData.caseId}`,
        Author: 'Project Rahat - Government of Chhattisgarh',
        Subject: 'Revenue Book Circular (RBC) 6(4) Final Case Report',
        Creator: 'Project Rahat Backend System',
        CreationDate: new Date(),
      },
    });

    // Set up fonts and colors
    const primaryColor = '#1a365d'; // Government blue
    const secondaryColor = '#2d3748'; // Dark gray
    const successColor = '#38a169'; // Green for completion

    try {
      // Header with Government Logo and Title
      this.addHeader(doc, caseData.caseId, primaryColor);

      // Official Government Styling
      this.addGovernmentStyling(doc, primaryColor, secondaryColor);

      // Case Information Section
      this.addCaseInformation(doc, caseData, primaryColor, secondaryColor);

      // Victim Details Section
      this.addVictimDetails(doc, caseData, primaryColor, secondaryColor);

      // Payment Information Section
      this.addPaymentInformation(doc, caseData, primaryColor, successColor);

      // Case Closure Information
      this.addClosureInformation(doc, caseData, primaryColor, successColor);

      // Official Footer
      this.addFooter(doc, primaryColor, secondaryColor);

      // End the document
      doc.end();
    } catch (error) {
      // If complex PDF fails, create a simple fallback
      doc.fontSize(16).text('FINAL CASE REPORT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Case ID: ${caseData.caseId}`);
      doc.moveDown();
      doc.text(`Status: ${caseData.status}`);
      doc.moveDown();
      doc.text(`Stage: ${caseData.stage}`);

      if (caseData.payment) {
        doc.moveDown();
        doc.text(`Payment Amount: ₹${caseData.payment.amount}`);
        doc.text(`Payment Date: ${caseData.payment.date.toLocaleDateString()}`);
      }

      doc.end();
    }

    return doc;
  }

  private static addPaymentInformation(
    doc: any,
    caseData: Case,
    primaryColor: string,
    successColor: string
  ) {
    const secondaryColor = '#2d3748'; // define here for use

    // Section header
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('PAYMENT INFORMATION', { underline: true })
      .moveDown(0.5);

    if (caseData.payment) {
      // Payment details in table format
      const paymentInfo = [
        ['Payment Status:', caseData.payment.status],
        ['Amount:', `₹${caseData.payment.amount.toLocaleString('en-IN')}`],
        ['Payment Date:', caseData.payment.date.toLocaleDateString('en-IN')],
        ['Processed By:', caseData.payment.processedBy],
        ['Payment Remark:', caseData.payment.remark],
      ];

      this.addTable(doc, paymentInfo, primaryColor, secondaryColor);
    } else {
      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .text('Payment information not available')
        .moveDown(0.5);
    }

    doc.moveDown(1);
  }

  private static addClosureInformation(
    doc: any,
    caseData: Case,
    primaryColor: string,
    successColor: string
  ) {
    const secondaryColor = '#2d3748'; // define here for use

    // Section header
    doc
      .fontSize(14)
      .fillColor(successColor)
      .font('Helvetica-Bold')
      .text('CASE CLOSURE CERTIFICATE', { underline: true })
      .moveDown(0.5);

    // Closure details
    doc
      .fontSize(10)
      .fillColor(secondaryColor)
      .text('This case has been successfully processed and closed.')
      .moveDown(0.3);

    doc
      .text(`Closure Date: ${new Date().toLocaleDateString('en-IN')}`)
      .moveDown(0.3);

    doc
      .text(
        'Funds have been distributed to the beneficiary as per government guidelines.'
      )
      .moveDown(0.3);

    doc
      .text('This document serves as the final certificate of case completion.')
      .moveDown(1);

    // Official stamp area
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('OFFICIAL STAMP', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor(secondaryColor)
      .text('Project Rahat - Government of Chhattisgarh', { align: 'center' })
      .moveDown(1);
  }
}
