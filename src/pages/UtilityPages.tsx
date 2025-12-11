
import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Lock, Search, Ticket, ArrowRight, Download, QrCode, Share2, Users, Home, Loader } from 'lucide-react';
import { jsPDF } from 'jspdf';
// Import jspdf-autotable to extend jsPDF prototype
import 'jspdf-autotable';
import { Booking, PassengerDetail } from '../types';
import { logger } from '../utils/logger';

export const NotFound: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <div className="bg-gray-100 p-6 rounded-full mb-6">
      <Search size={48} className="text-gray-400" />
    </div>
    <h1 className="text-4xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
    <p className="text-gray-500 mb-8 max-w-md">O conteúdo que você procura não existe ou foi movido.</p>
    <Link to="/" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
      Voltar para o Início
    </Link>
  </div>
);

export const Unauthorized: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <div className="bg-red-50 p-6 rounded-full mb-6">
      <AlertTriangle size={48} className="text-red-500" />
    </div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
    <p className="text-gray-500 mb-8 max-w-md">Você não tem permissão para acessar esta página.</p>
    <Link to="/" className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
      Ir para Home
    </Link>
  </div>
);

export const CheckoutSuccess: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { booking?: Booking; passengers?: PassengerDetail[] } | null;
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fallback if state is lost (e.g., page refresh)
  if (!state?.booking) {
      return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 bg-gray-50">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                      <Search size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Sessão Expirada</h2>
                  <p className="text-gray-500 mb-6 text-sm">
                      Os dados temporários da reserva não estão mais disponíveis aqui. Acesse seu painel para ver o voucher.
                  </p>
                  <Link 
                    to={agencySlug ? `/${agencySlug}/client/BOOKINGS` : '/client/dashboard/BOOKINGS'} 
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-primary-700 transition-colors"
                  >
                      Ir para Meus Pedidos
                  </Link>
              </div>
          </div>
      );
  }

  const { booking, passengers: statePassengers } = state;
  
  // Use passengers from state, or fallback to booking.passengerDetails, or empty array
  const passengers = statePassengers || booking?.passengerDetails || [];
  
  const linkDashboard = agencySlug ? `/${agencySlug}/client/BOOKINGS` : '/client/dashboard/BOOKINGS';
  const linkTrips = agencySlug ? `/${agencySlug}/trips` : '/trips';

  const voucherCode = booking.voucherCode;
  const tripDate = booking.date ? new Date(booking.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const tripTitle = booking._trip?.title || 'Pacote de Viagem';
  const agencyName = booking._agency?.name || 'ViajaStore';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Viagem ViajaStore',
          text: `Reservei minha viagem para ${tripTitle}! Voucher: ${voucherCode}`,
          url: window.location.href,
        });
      } catch (error) {
        logger.error('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(`Reservei minha viagem! Voucher: ${voucherCode}`);
      alert('Informações copiadas para a área de transferência!');
    }
  };

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

  const generateTicketPDF = async () => {
    setIsGeneratingPdf(true);
    try {
        const doc = new jsPDF();
        
        // Verify autoTable is available
        const hasAutoTable = typeof (doc as any).autoTable === 'function';
        if (!hasAutoTable) {
          logger.warn("jspdf-autotable plugin not loaded, using manual table rendering");
        }
        
        // --- 1. PREMIUM HEADER ---
        // Blue Header Background
        doc.setFillColor(59, 130, 246); // Primary Blue #3b82f6
        doc.rect(0, 0, 210, 40, 'F');
        
        // Logo / Brand Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(agencyName.toUpperCase(), 15, 25);
        
        // Voucher Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('VOUCHER DE EMBARQUE', 195, 25, { align: 'right' });

        // --- 2. TRIP INFO GRID ---
        doc.setTextColor(30, 41, 59); // Slate 800
        
        // Trip Title (Large)
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(tripTitle, 15, 55);

        // Grid Data
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        
        // Column 1
        doc.text('DATA DA VIAGEM', 15, 65);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(tripDate, 15, 70);

        // Column 2
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('LOCAL DE DESTINO', 70, 65);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(booking._trip?.destination || '---', 70, 70);

        // Column 3 - Highlighted Code
        doc.setFillColor(243, 244, 246); // Gray 100
        doc.roundedRect(145, 60, 50, 15, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246); // Primary Blue
        doc.text(voucherCode, 170, 69, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('CÓDIGO DA RESERVA', 170, 58, { align: 'center' });

        // --- 3. PASSENGERS TABLE ---
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Lista de Passageiros', 15, 90);

        // Prepare table data from passengers array
        // If we have passenger details, use them; otherwise show a fallback
        const getPassengerType = (p: any): string => {
          if (p.type === 'child') return 'Criança';
          if (p.age !== undefined) {
            return p.age < 12 ? 'Criança' : 'Adulto';
          }
          if (p.birthDate) {
            const today = new Date();
            const birth = new Date(p.birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return age < 12 ? 'Criança' : 'Adulto';
          }
          return 'Adulto';
        };
        
        const tableBody = passengers.length > 0 
            ? passengers.map((p: any) => [
                p.name || '---', 
                p.document || '---', 
                getPassengerType(p)
              ]) 
            : booking?.passengerDetails && booking.passengerDetails.length > 0
            ? booking.passengerDetails.map((p: any) => [
                p.name || '---', 
                p.document || '---', 
                getPassengerType(p)
              ])
            : [['Passageiro Principal', '---', 'Adulto']];

        // Generate Table
        let finalY = 95;
        try {
          // Check if autoTable is available
          if (hasAutoTable) {
            (doc as any).autoTable({
              startY: 95,
              head: [['Nome Completo', 'Documento', 'Tipo']],
              body: tableBody,
              theme: 'striped',
              headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
              styles: { fontSize: 10, cellPadding: 4 },
              alternateRowStyles: { fillColor: [255, 255, 255] },
            });
            finalY = (doc as any).lastAutoTable?.finalY || 95;
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
            
            tableBody.forEach((row: any[]) => {
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
          tableBody.forEach((row: any[], index: number) => {
            doc.setFontSize(9);
            doc.text(`${index + 1}. ${row[0] || ''} - ${row[1] || '---'}`, 15, finalY);
            finalY += 6;
          });
          finalY += 5;
        }

        // --- 4. QR CODE & FOOTER ---
        finalY += 10;
        
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
                doc.addImage(qrBase64, 'PNG', 160, finalY, 35, 35);
            } catch (imgError) {
                logger.warn("Failed to add QR code image to PDF:", imgError);
            }
        } else {
            // Draw placeholder text if QR code failed
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text('QR Code', 177.5, finalY + 17.5, { align: 'center' });
            doc.text('indisponível', 177.5, finalY + 22.5, { align: 'center' });
        }
        
        // Instructions Text (Left side)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Instruções Importantes', 15, finalY + 5);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const instructions = [
            '• Chegue ao local de embarque com 30 minutos de antecedência.',
            '• É obrigatória a apresentação de documento original com foto.',
            '• Apresente este QR Code ou o código da reserva para o guia.',
            `• Em caso de dúvidas, contate ${agencyName}.`
        ];
        
        let textY = finalY + 12;
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
        alert(`Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}. Tente novamente.`);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-gray-50 animate-[fadeIn_0.5s]">
      
      {/* Ticket Visual */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Top Section (Green) */}
          <div className="bg-green-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white/20 p-3 rounded-full mb-4 backdrop-blur-sm">
                      <CheckCircle size={48} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold mb-1">Reserva Confirmada!</h1>
                  <p className="text-green-100 text-sm">Sua aventura está garantida.</p>
              </div>
          </div>

          {/* Ticket Body */}
          <div className="p-8 bg-white relative">
              {/* Perforated Line Effect */}
              <div className="absolute -top-3 left-0 w-full flex justify-between px-2">
                  {[...Array(12)].map((_,i) => <div key={i} className="w-4 h-4 bg-gray-50 rounded-full -mt-2"></div>)}
              </div>

              <div className="space-y-6 mt-4">
                  <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                      <div className="text-left">
                          <p className="text-xs text-gray-400 uppercase font-bold">Código da Reserva</p>
                          <p className="text-xl font-mono font-bold text-gray-900">{voucherCode}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase font-bold">Data</p>
                          <p className="text-sm font-bold text-gray-900">{tripDate}</p>
                      </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(voucherCode)}`} 
                        alt="QR Code" 
                        className="w-16 h-16 object-contain mix-blend-multiply opacity-80"
                      />
                      <div className="text-left">
                          <p className="text-xs text-gray-500 leading-tight mb-1">Apresente este código ou acesse seu voucher digital no painel.</p>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              generateTicketPDF();
                            }} 
                            disabled={isGeneratingPdf} 
                            className="text-xs font-bold text-primary-600 flex items-center hover:underline disabled:opacity-50 cursor-pointer"
                            type="button"
                          >
                              {isGeneratingPdf ? <Loader size={12} className="animate-spin mr-1"/> : <Download size={12} className="mr-1"/>}
                              Baixar Voucher PDF
                          </button>
                      </div>
                  </div>

                  {/* Passengers List Visual */}
                  {passengers.length > 0 && (
                    <div className="border-t border-dashed border-gray-200 pt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1">
                            <Users size={12}/> Passageiros nesta reserva
                        </p>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar text-left bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                            {passengers.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">{idx+1}</div>
                                        <span className="font-medium text-gray-700 truncate max-w-[140px]">{p.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">{p.document || '---'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                      <div className="flex gap-3">
                        <Link to={linkDashboard} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2 group text-sm">
                            <Ticket size={16}/> Minhas Viagens
                        </Link>
                        <button onClick={handleShare} className="bg-primary-50 text-primary-600 p-3 rounded-xl hover:bg-primary-100 transition-colors shadow-sm border border-primary-100" title="Compartilhar">
                            <Share2 size={20} />
                        </button>
                      </div>
                      <Link to={linkTrips} className="block w-full text-gray-500 py-2 rounded-xl font-bold text-xs hover:text-gray-700 transition-colors">
                          <Home size={12} className="inline mr-1 mb-0.5"/> Voltar para Loja
                      </Link>
                  </div>
              </div>
          </div>
      </div>
      
      <p className="text-gray-400 text-xs mt-8 max-w-xs mx-auto leading-relaxed">
          Enviamos um e-mail com todos os detalhes do seu pedido. Em caso de dúvidas, entre em contato com a agência.
      </p>
    </div>
  );
};

export const ForgotPassword: React.FC = () => {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
             <Lock className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Recuperar Senha</h2>
          <p className="text-sm text-gray-500 mt-2">Digite seu email para receber o link de recuperação.</p>
        </div>

        {!sent ? (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="seu@email.com" />
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700">
              Enviar Link
            </button>
            <div className="mt-4 text-center">
              <Link to="/#login" className="text-sm text-gray-600 hover:text-primary-600">Voltar para o Login</Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm">
              Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada.
            </div>
            <Link to="/#login" className="text-primary-600 font-bold hover:underline">Voltar para o Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};
