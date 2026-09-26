import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { AddressRegistration } from '../lib/firebase.js';

/**
 * Generate a high-resolution QR code data URL pointing to Google Maps
 */
export async function generateAddressQRCode(lat: number, lng: number, address: string): Promise<string> {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  try {
    const dataUrl = await QRCode.toDataURL(googleMapsUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('QR code generation error:', err);
    throw err;
  }
}

/**
 * Generate an official, elegant Luxury PDF certificate for the address registration
 */
export async function generateAddressPDF(item: AddressRegistration): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Background and borders (Navy & Gold)
  doc.setFillColor(11, 19, 41); // Navy header
  doc.rect(0, 0, 210, 42, 'F');

  // Gold accent line
  doc.setDrawColor(212, 175, 55); // Gold
  doc.setLineWidth(1.2);
  doc.line(0, 42, 210, 42);

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('GOOGLE MAPS ADDRESS DOSSIER', 105, 22, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(212, 175, 55);
  doc.text('OFFICIAL VERIFICATION & SUBMISSION CERTIFICATE', 105, 32, { align: 'center' });

  // Body content setup
  doc.setTextColor(30, 41, 59);
  let y = 56;

  // Status Badge
  doc.setFillColor(243, 230, 171); // Light Gold
  doc.roundedRect(15, y, 180, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(161, 98, 7);
  doc.text(`REGISTRATION ID: ${item.id}`, 20, y + 10);
  doc.text(item.complete ? 'STATUS: VALIDATED & READY FOR GOOGLE' : 'STATUS: INCOMPLETE / REVIEW', 140, y + 10);

  y += 26;

  // Address Details Box
  doc.setFontSize(14);
  doc.setTextColor(11, 19, 41);
  doc.setFont('helvetica', 'bold');
  doc.text('Verified Address Specifications', 15, y);

  y += 7;
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Building / Place Name:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(item.name || 'N/A', 65, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Standardized Address:', 15, y);
  doc.setFont('helvetica', 'normal');
  const splitAddress = doc.splitTextToSize(item.formattedAddress, 125);
  doc.text(splitAddress, 65, y);
  y += splitAddress.length * 6 + 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Geographic Coordinates:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Latitude: ${item.lat.toFixed(6)} | Longitude: ${item.lng.toFixed(6)}`, 65, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Validation Granularity:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${item.granularity} (Google Address Validation API)`, 65, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Country / Region Code:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(item.regionCode || 'GLOBAL', 65, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Registered By:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${item.userEmail || 'Anonymous/Guest'} (Date: ${new Date(item.createdAt).toLocaleDateString()})`, 65, y);
  y += 14;

  // Add QR Code
  try {
    const qrDataUrl = await generateAddressQRCode(item.lat, item.lng, item.formattedAddress);
    doc.addImage(qrDataUrl, 'PNG', 15, y, 42, 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(11, 19, 41);
    doc.text('Scan to Open on Google Maps', 65, y + 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Anyone with a mobile camera can scan this QR code to navigate directly', 65, y + 21);
    doc.text('to this verified pin on Google Maps.', 65, y + 26);
    doc.text(`Direct link: https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`, 65, y + 33);
  } catch (e) {
    console.error('Failed to attach QR code to PDF', e);
  }

  y += 50;

  // Notice about Google Review
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL GOOGLE MAPS PUBLIC REVIEW NOTICE:', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const notice =
    'This document records a private address validation performed via Google Maps Platform APIs. Public additions to Google Maps are governed exclusively by Google’s automated and human review procedures (via the Google Maps "Add a Missing Place" contribution pipeline). Google verifies street imagery, parcel boundaries, and cadastral data before making additions publicly searchable.';
  const splitNotice = doc.splitTextToSize(notice, 170);
  doc.text(splitNotice, 20, y + 13);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Address Map App • Document SHA-${item.id}`, 105, 285, { align: 'center' });

  // Trigger Download
  doc.save(`Google_Maps_Registration_${item.id}.pdf`);
}
