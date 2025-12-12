import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Booking, Trip, Agency, PassengerDetail, Client } from '../types';
import { logger } from './logger';

// Helper to convert image URL to Base64 for PDF
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Set timeout to avoid hanging
    const timeout = setTimeout(() => {
      logger.warn("Image load timeout, using fallback");
      resolve("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    }, 10000); // 10 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        } else {
          throw new Error("Could not get canvas context");
        }
      } catch (error) {
        logger.error("Error converting image to base64:", error);
        clearTimeout(timeout);
        // Fallback empty transparent pixel if fails
        resolve("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
      }
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      logger.error("Error loading image:", error);
      // Fallback empty transparent pixel if fails
      resolve("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    };
    
    img.src = url;
  });
};

interface GenerateTripVoucherPDFParams {
  booking: Booking;
  trip: Trip;
  agency: Agency | null | undefined;
  passengers: PassengerDetail[];
  voucherCode: string;
  client?: Client | null; // Optional client data
}

/**
 * Generates a premium travel voucher PDF with unified styling
 * @param params - Object containing booking, trip, agency, passengers, voucherCode, and optional client
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export const generateTripVoucherPDF = async ({
  booking,
  trip,
  agency,
  passengers,
  voucherCode,
  client
}: GenerateTripVoucherPDFParams): Promise<void> => {
  try {
    const doc = new jsPDF();
    
    // Verify autoTable is available
    const hasAutoTable = typeof (doc as any).autoTable === 'function';
    if (!hasAutoTable) {
      logger.warn("jspdf-autotable plugin not loaded, using manual table rendering");
    }
    
    // Initialize Y position tracker
    let currentY = 60;
    
    // --- 1. PREMIUM HEADER WITH AGENCY LOGO ---
    // White background for clean, minimalist design
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Try to load and add agency logo
    let logoBase64: string | null = null;
    if (agency?.logo) {
      try {
        logoBase64 = await getBase64ImageFromURL(agency.logo);
        if (logoBase64 && logoBase64 !== "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") {
          // Add logo on the left (max 30px height)
          doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
        }
      } catch (err) {
        logger.warn('Could not load agency logo:', err);
      }
    }
    
    // Agency Name (to the right of logo, or left if no logo)
    doc.setTextColor(30, 41, 59); // Dark gray
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const agencyName = agency?.name || 'ViajaStore Partner';
    const logoWidth = logoBase64 ? 50 : 0;
    doc.text(agencyName, 15 + logoWidth, 25);
    
    // Voucher Title (top right)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Gray
    doc.text('VOUCHER DE EMBARQUE', 195, 20, { align: 'right' });
    
    // Subtle border line
    doc.setDrawColor(226, 232, 240); // Light gray
    doc.setLineWidth(0.5);
    doc.line(15, 50, 195, 50);

    // --- 2. TRIP DETAILS (Minimalist & Clean) ---
    currentY = 60;
    
    // Trip Title (Large, clean)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Dark gray
    const tripTitle = trip.title || 'Pacote de Viagem';
    doc.text(tripTitle, 15, currentY);
    currentY += 8;

    // Trip Details Grid (Clean, minimalist)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Gray
    
    // Row 1: Date and Destination
    doc.text('Data:', 15, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    const tripDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('pt-BR') : '---';
    doc.text(tripDate, 30, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Destino:', 100, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(trip.destination || '---', 125, currentY);
    currentY += 6;

    // Row 2: Duration (if available)
    if (trip.durationDays) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Duração:', 15, currentY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${trip.durationDays} ${trip.durationDays === 1 ? 'dia' : 'dias'}`, 40, currentY);
      currentY += 6;
    }

    // Voucher Code (Highlighted, clean)
    currentY += 4;
    doc.setFillColor(243, 244, 246); // Light gray background
    doc.roundedRect(15, currentY - 5, 180, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246); // Primary Blue
    doc.text('Código da Reserva:', 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(voucherCode, 70, currentY);
    currentY += 10;

    // --- 3. PASSENGERS TABLE ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Lista de Passageiros', 15, currentY);
    currentY += 5;

    // Prepare table data from passengers array
    const getPassengerType = (p: PassengerDetail | any): string => {
      // Check explicit type first
      if (p.type === 'child' || p.type === 'Criança') return 'Criança';
      if (p.type === 'adult' || p.type === 'Adulto') return 'Adulto';
      
      // Check age if available
      if (p.age !== undefined && p.age !== null) {
        return p.age < 12 ? 'Criança' : 'Adulto';
      }
      
      // Calculate age from birth date
      if (p.birthDate || p.birth_date) {
        try {
          const today = new Date();
          const birth = new Date(p.birthDate || p.birth_date);
          
          // Validate date
          if (isNaN(birth.getTime())) {
            return 'Adulto'; // Invalid date, default to adult
          }
          
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age < 12 ? 'Criança' : 'Adulto';
        } catch (error) {
          logger.warn('Error calculating age from birth date:', error);
          return 'Adulto';
        }
      }
      
      // Default to adult
      return 'Adulto';
    };
    
    // Prepare table body from passengers array or booking.passengerDetails
    // Priority: passengers param > booking.passengerDetails > client fallback
    let tableBody: string[][];
    
    // Log for debugging
    logger.info(`=== PDF GENERATOR: Processing ${passengers.length} passenger(s) from params ===`);
    logger.info('Raw passengers array:', JSON.stringify(passengers, null, 2));
    passengers.forEach((p: any, idx) => {
      logger.info(`  Passenger ${idx + 1}:`, {
        name: p.name,
        document: p.document,
        cpf: (p as any).cpf,
        type: p.type,
        birthDate: p.birthDate,
        age: p.age,
        full_name: (p as any).full_name
      });
    });
    
    if (passengers.length > 0) {
      // Use provided passengers array (highest priority)
      // IMPORTANT: Include ALL passengers, even if some fields are missing
      tableBody = passengers.map((p: any, index: number) => {
        // Get name (support multiple field names) - NEVER use '---' for name
        const passengerName = p.name || p.full_name || p.nome || `Passageiro ${index + 1}`;
        
        // Format document if it's a CPF (11 digits)
        let formattedDoc = p.document || p.cpf || '---';
        if (formattedDoc && formattedDoc !== '---') {
          // Remove any existing formatting
          const digits = formattedDoc.replace(/\D/g, '');
          if (digits.length === 11) {
            formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
          } else if (digits.length > 0) {
            // Keep original format if not 11 digits
            formattedDoc = formattedDoc;
          }
        }
        
        const passengerType = getPassengerType(p);
        
        // Log each passenger for debugging
        logger.info(`PDF Table Row ${index + 1}: "${passengerName}" | "${formattedDoc}" | "${passengerType}"`);
        
        return [
          passengerName, 
          formattedDoc, 
          passengerType
        ];
      });
      
      logger.info(`✅ PDF Generator: Created table with ${tableBody.length} row(s)`);
      logger.info('Table body preview:', tableBody.map((row, idx) => `[${idx + 1}] ${row[0]} | ${row[1]} | ${row[2]}`));
    } else if (booking.passengerDetails && booking.passengerDetails.length > 0) {
      // Fallback to booking.passengerDetails
      tableBody = booking.passengerDetails.map((p: PassengerDetail) => {
        let formattedDoc = p.document || '---';
        if (formattedDoc && formattedDoc !== '---' && /^\d{11}$/.test(formattedDoc.replace(/\D/g, ''))) {
          formattedDoc = formattedDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return [
          p.name || '---', 
          formattedDoc, 
          getPassengerType(p)
        ];
      });
    } else if (client) {
      // Final fallback: use client data
      let formattedDoc = client.cpf || '---';
      if (formattedDoc && formattedDoc !== '---' && /^\d{11}$/.test(formattedDoc.replace(/\D/g, ''))) {
        formattedDoc = formattedDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      tableBody = [[
        client.name || 'Cliente', 
        formattedDoc, 
        'Adulto'
      ]];
    } else {
      // Last resort fallback
      tableBody = [['Passageiro Principal', '---', 'Adulto']];
    }

    // Generate Table
    let finalY = currentY;
    try {
      // Check if autoTable is available
      if (hasAutoTable) {
        (doc as any).autoTable({
          startY: currentY,
          head: [['Nome Completo', 'Documento', 'Tipo']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4 },
          alternateRowStyles: { fillColor: [255, 255, 255] },
        });
        finalY = (doc as any).lastAutoTable?.finalY || currentY;
      } else {
        // Fallback: Manual table drawing if autoTable is not available
        logger.warn("autoTable not available, using manual table");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.text('Nome Completo', 15, finalY);
        doc.text('Documento', 80, finalY);
        doc.text('Tipo', 140, finalY);
        finalY += 5;
        doc.setDrawColor(226, 232, 240);
        doc.line(15, finalY, 195, finalY);
        finalY += 8;
        
        tableBody.forEach((row: string[]) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          doc.text((row[0] || '').substring(0, 30), 15, finalY);
          doc.text((row[1] || '---').substring(0, 20), 80, finalY);
          doc.text(row[2] || '', 140, finalY);
          finalY += 7;
        });
        finalY += 5;
      }
    } catch (tableError: any) {
      logger.error("Error generating table:", tableError);
      // Fallback: Simple text list
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Passageiros:', 15, finalY);
      finalY += 8;
      doc.setFont('helvetica', 'normal');
      tableBody.forEach((row: string[], index: number) => {
        doc.setFontSize(9);
        doc.text(`${index + 1}. ${row[0] || ''} - ${row[1] || '---'}`, 15, finalY);
        finalY += 6;
      });
      finalY += 5;
    }
    
    // Update currentY for next section
    currentY = finalY + 10;
    
    // Generate QR Code Base64 with error handling
    let qrBase64: string | null = null;
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(voucherCode)}`;
        qrBase64 = await getBase64ImageFromURL(qrUrl);
    } catch (qrError) {
        logger.warn("QR Code generation failed, continuing without QR code:", qrError);
        // Continue without QR code - not critical
    }
    
    // Draw QR Code if available (Bottom Right area relative to table)
    if (qrBase64) {
        try {
            doc.addImage(qrBase64, 'PNG', 160, currentY, 35, 35);
        } catch (imgError) {
            logger.warn("Failed to add QR code image to PDF:", imgError);
        }
    } else {
        // Draw placeholder text if QR code failed
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('QR Code', 177.5, currentY + 17.5, { align: 'center' });
        doc.text('indisponível', 177.5, currentY + 22.5, { align: 'center' });
    }
    
    // Instructions Text (Left side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Instruções Importantes', 15, currentY + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const instructions = [
        '• Chegue ao local de embarque com 30 minutos de antecedência.',
        '• É obrigatória a apresentação de documento original com foto.',
        '• Apresente este QR Code ou o código da reserva para o guia.',
        `• Em caso de dúvidas, contate ${agencyName}.`
    ];
    
    let textY = currentY + 12;
    instructions.forEach(line => {
        doc.text(line, 15, textY);
        textY += 5;
    });

    // Footer Border
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(15, pageHeight - 20, 195, pageHeight - 20);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Emitido por ViajaStore - O maior marketplace de viagens do Brasil.', 105, pageHeight - 12, { align: 'center' });

    // Save PDF - This should trigger download
    const fileName = `voucher_${voucherCode || 'reserva'}.pdf`;
    
    // Ensure we have a valid voucher code
    if (!voucherCode) {
      throw new Error('Código do voucher não encontrado');
    }
    
    // Save the PDF
    try {
      doc.save(fileName);
      logger.info(`PDF gerado com sucesso: ${fileName}`);
    } catch (saveError) {
      logger.error("Error saving PDF:", saveError);
      // Try alternative method
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logger.info(`PDF gerado via método alternativo: ${fileName}`);
    }
  } catch (error: any) {
    logger.error("PDF Generation Error:", error);
    throw new Error(`Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}`);
  }
};
