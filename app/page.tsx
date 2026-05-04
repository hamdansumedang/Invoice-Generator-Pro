'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Printer, Plus, Trash2, X, Upload, Download, PenTool } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import SignatureCanvas from 'react-signature-canvas';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  bankDetails: string;
  logo: string | null;
  signature: string | null;
  signatureName: string;
}

interface InvoiceDetails {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  taxPercent: number;
  discount: number;
  notes: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  address: string;
}

interface Item {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: "PT ROJO BRONTOLANO",
  address: "KP SIMPANG No.04A, RT.004/RW.001, Haurngombong, Kec. Pamulihan, Kabupaten Sumedang, Jawa Barat 40381",
  phone: "0855-7271-197",
  email: "admin@brontolano.com",
  bankDetails: "Bank Mandiri\nNo. Rek: 1320030132881\nA. N. Maulana Ja'far Sodiq",
  logo: null,
  signature: null,
  signatureName: "Hormat Kami"
};

export default function InvoiceApp() {
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);
  
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    address: ''
  });

  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    invoiceNumber: 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    taxPercent: 0,
    discount: 0,
    notes: 'Terima kasih atas kepercayaan Anda bertransaksi dengan kami.'
  });

  const [items, setItems] = useState<Item[]>([
    { id: '1', description: '', quantity: 1, price: 0 }
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [printLayout, setPrintLayout] = useState<'invoice' | 'receipt'>('invoice');

  // Load settings on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('invoice_company_info');
    if (saved) {
      try {
        setCompanyInfo(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
  }, []);

  const saveSettings = (newInfo: CompanyInfo) => {
    setCompanyInfo(newInfo);
    try {
      localStorage.setItem('invoice_company_info', JSON.stringify(newInfo));
    } catch (e) {
      alert("Gagal menyimpan identitas. Ukuran logo mungkin terlalu besar.");
    }
    setShowSettings(false);
  };

  const handleExportPDF = async () => {
    const previewId = printLayout === 'invoice' ? 'invoice-preview' : 'receipt-preview';
    const element = document.getElementById(previewId);
    if (!element) return;
    
    setIsExporting(true);
    try {
      // Small timeout to allow any pending UI updates to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      const imgData = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate actual image height in pdf units
      const imgHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add subsequent pages if content overflows
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${invoiceDetails.invoiceNumber || 'invoice'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const updateItem = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const taxAmount = subtotal * (invoiceDetails.taxPercent / 100);
  const total = subtotal + taxAmount - invoiceDetails.discount;

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white text-gray-900 font-sans">
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          currentInfo={companyInfo} 
          onSave={saveSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col xl:flex-row gap-8 print:p-0 print:block">
        
        {/* LEFT COLUMN: Form Controls (Hidden on Print) */}
        <div className="w-full xl:w-5/12 print:hidden space-y-6">
          
          {/* Header Controls */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Invoice Generator Pro
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSettings(true)} 
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="Pengaturan Perusahaan"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-8">
            {/* Invoice Details Setting */}
            <section>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Detail Tagihan</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">No. Invoice</label>
                  <input 
                    type="text" 
                    value={invoiceDetails.invoiceNumber} 
                    onChange={e => setInvoiceDetails({...invoiceDetails, invoiceNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal</label>
                  <input 
                    type="date" 
                    value={invoiceDetails.date} 
                    onChange={e => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Jatuh Tempo</label>
                  <input 
                    type="date" 
                    value={invoiceDetails.dueDate} 
                    onChange={e => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Customer Details Setting */}
            <section>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Data Pelanggan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Pelanggan / Institusi</label>
                  <input 
                    type="text" 
                    placeholder="Bpk. Budi / PT Maju Mundur"
                    value={customerInfo.name} 
                    onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Pelanggan</label>
                  <input 
                    type="email" 
                    placeholder="budi@example.com"
                    value={customerInfo.email} 
                    onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Alamat Pelanggan</label>
                  <textarea 
                    rows={2}
                    placeholder="Jl. Merdeka No. 45..."
                    value={customerInfo.address} 
                    onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Items Configuration */}
            <section>
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-widest">Daftar Item</h2>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-xl border flex gap-3 items-start group">
                    <div className="flex-1 space-y-3">
                      <input 
                        type="text" 
                        placeholder="Deskripsi jasa atau produk"
                        value={item.description} 
                        onChange={e => updateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      <div className="flex gap-2">
                        <div className="w-24">
                          <input 
                            type="number" min="1" 
                            placeholder="Qty"
                            value={item.quantity || ''} 
                            onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="number" min="0" 
                            placeholder="Harga Satuan (Rp)"
                            value={item.price || ''} 
                            onChange={e => updateItem(index, 'price', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className={`text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg mt-1 transition-colors ${items.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={items.length === 1}
                      title="Hapus Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={addItem}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <Plus size={18} /> Tambah Item
                </button>
              </div>
            </section>

            {/* Additional Charges / Discount */}
            <section>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Pengaturan Lanjutan</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Pajak / PPN (%)</label>
                  <input 
                    type="number" min="0" max="100" 
                    placeholder="Contoh: 11"
                    value={invoiceDetails.taxPercent || ''} 
                    onChange={e => setInvoiceDetails({...invoiceDetails, taxPercent: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Potongan Harga (Rp)</label>
                  <input 
                    type="number" min="0" 
                    placeholder="Contoh: 50000"
                    value={invoiceDetails.discount || ''} 
                    onChange={e => setInvoiceDetails({...invoiceDetails, discount: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Catatan Tambahan</label>
                <textarea 
                  rows={2}
                  placeholder="Terima kasih..."
                  value={invoiceDetails.notes} 
                  onChange={e => setInvoiceDetails({...invoiceDetails, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN: Print Preview Layout */}
        <div className="w-full xl:w-7/12 print:w-full print:block overflow-x-auto pb-8 print:pb-0">
          
          <div className="mb-4 flex flex-wrap gap-2 justify-between items-center print:hidden sticky left-0">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border items-center">
              <button 
                onClick={() => setPrintLayout('invoice')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${printLayout === 'invoice' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Ukuran A4
              </button>
              <button 
                onClick={() => setPrintLayout('receipt')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${printLayout === 'receipt' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Struk Thermal
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm"
                title="Cetak via Browser"
              >
                <Printer size={16} />
                <span>Cetak</span>
              </button>
              <button 
                onClick={handleExportPDF} 
                disabled={isExporting}
                className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isExporting ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>{isExporting ? 'PDF...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          <div className="min-w-fit flex justify-center print:block">
            {/* Paper container */}
            {printLayout === 'invoice' && (
              <div 
                id="invoice-preview"
                className="bg-white shadow-2xl shrink-0 flex flex-col relative print:shadow-none print:m-0 mx-auto"
                style={{ 
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '20mm'
                }}
              >
            {/* INVOICE HEADER */}
            <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8">
              <div className="w-1/2 pr-4">
                {companyInfo.logo && (
                  <img 
                    src={companyInfo.logo} 
                    alt="Logo Perusahaan" 
                    className="max-h-20 mb-4 object-contain" 
                  />
                )}
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  {companyInfo.name || 'Nama Perusahaan'}
                </h2>
                <div className="text-gray-500 mt-2 text-sm leading-relaxed whitespace-pre-line">
                  {companyInfo.address}
                </div>
                <div className="text-gray-500 mt-2 text-sm">
                  {companyInfo.phone && <span>{companyInfo.phone}</span>}
                  {companyInfo.phone && companyInfo.email && <span className="mx-2">•</span>}
                  {companyInfo.email && <span>{companyInfo.email}</span>}
                </div>
              </div>

              <div className="w-1/2 text-right pl-4">
                <h1 className="text-5xl font-black text-gray-200 uppercase tracking-wider mb-2">Invoice</h1>
                <div className="mt-6 flex flex-col gap-1 items-end">
                  <div className="grid grid-cols-2 gap-4 w-64 text-sm">
                    <span className="font-semibold text-gray-600 text-left">No. Invoice</span>
                    <span className="text-gray-900 border-b border-dashed border-gray-200 pb-0.5">{invoiceDetails.invoiceNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-64 text-sm mt-1">
                    <span className="font-semibold text-gray-600 text-left">Tanggal</span>
                    <span className="text-gray-900 border-b border-dashed border-gray-200 pb-0.5">{invoiceDetails.date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-64 text-sm mt-1">
                    <span className="font-semibold text-gray-600 text-left">Jatuh Tempo</span>
                    <span className="text-gray-900 border-b border-dashed border-gray-200 pb-0.5">{invoiceDetails.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BILL TO */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 border-l-4 border-blue-500 pl-3">
                Ditagihkan Kepada
              </h3>
              <div className="pl-4">
                <p className="font-bold text-gray-900 text-lg">
                  {customerInfo.name || 'Nama Pelanggan / Institusi'}
                </p>
                {customerInfo.address && (
                  <p className="text-gray-600 mt-1 whitespace-pre-line text-sm max-w-sm leading-relaxed">
                    {customerInfo.address}
                  </p>
                )}
                {customerInfo.email && (
                  <p className="text-gray-600 mt-1 text-sm">{customerInfo.email}</p>
                )}
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="flex-1">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="py-3 px-4 font-semibold text-gray-700 w-1/2">Deskripsi Item</th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-center">Qty</th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 text-gray-800">
                        {item.description || <span className="text-gray-400 italic">Deskripsi belum diisi...</span>}
                      </td>
                      <td className="py-4 px-4 text-gray-800 text-center">{item.quantity}</td>
                      <td className="py-4 px-4 text-gray-800 text-right">{formatIDR(item.price)}</td>
                      <td className="py-4 px-4 font-medium text-gray-900 text-right">
                        {formatIDR(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                  {/* Empty state padding if very few items */}
                  {items.length < 3 && (
                     <tr className="border-transparent"><td className="py-8"></td><td/><td/><td/></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TOTALS CALCULATION */}
            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-end">
              <div className="w-full max-w-md space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 px-4">
                  <span>Subtotal</span>
                  <span>{formatIDR(subtotal)}</span>
                </div>
                
                {invoiceDetails.taxPercent > 0 && (
                  <div className="flex justify-between text-gray-600 px-4">
                    <span>Pajak PPN ({invoiceDetails.taxPercent}%)</span>
                    <span>{formatIDR(taxAmount)}</span>
                  </div>
                )}
                
                {invoiceDetails.discount > 0 && (
                  <div className="flex justify-between text-red-500 px-4">
                    <span>Diskon</span>
                    <span>-{formatIDR(invoiceDetails.discount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg text-gray-900 bg-gray-50 p-4 border-l-4 border-blue-500 rounded-r-lg mt-4">
                  <span>Total Tagihan</span>
                  <span>{formatIDR(total)}</span>
                </div>
              </div>
            </div>

            {/* FOOTER INFO */}
            <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-800 uppercase tracking-widest text-xs mb-2">Informasi Pembayaran</h4>
                  <div className="text-gray-600 whitespace-pre-line leading-relaxed border p-4 rounded-lg bg-gray-50">
                    {companyInfo.bankDetails || 'Belum ada data rekening'}
                  </div>
                </div>
                {invoiceDetails.notes && (
                  <div>
                    <h4 className="font-bold text-gray-800 uppercase tracking-widest text-xs mb-2">Catatan Tambahan</h4>
                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                      {invoiceDetails.notes}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-end text-center pt-8 w-48 ml-auto">
                {companyInfo.signature ? (
                  <img src={companyInfo.signature} alt="Tanda Tangan" className="h-24 object-contain mb-2 mix-blend-multiply" />
                ) : (
                  <div className="h-24"></div> 
                )}
                <div className="border-t border-gray-400 w-full pt-2">
                  <p className="font-bold text-gray-900">{companyInfo.signatureName || companyInfo.name || 'Hormat Kami'}</p>
                </div>
              </div>
            </div>
          </div>
            )}

            {printLayout === 'receipt' && (
              <div 
                id="receipt-preview"
                className="bg-white shadow-2xl shrink-0 flex flex-col relative print:shadow-none print:m-0 mx-auto border"
                style={{ 
                  width: '80mm',
                  minHeight: '100mm',
                  padding: '5mm',
                  fontFamily: 'monospace'
                }}
              >
                <div className="text-center pb-4 border-b border-dashed border-gray-400 mb-4">
                  {companyInfo.logo && (
                    <img 
                      src={companyInfo.logo} 
                      alt="Logo" 
                      className="max-h-12 mx-auto mb-2 object-contain grayscale" 
                    />
                  )}
                  <h2 className="text-lg font-bold uppercase">{companyInfo.name || 'RECEIPT'}</h2>
                  <div className="text-xs mt-1 whitespace-pre-line">{companyInfo.address}</div>
                  <div className="text-xs mt-1">{companyInfo.phone}</div>
                </div>

                <div className="text-xs mb-4">
                  <div className="flex justify-between"><span>No:</span><span>{invoiceDetails.invoiceNumber}</span></div>
                  <div className="flex justify-between"><span>Tgl:</span><span>{invoiceDetails.date}</span></div>
                  <div className="flex justify-between"><span>Plg:</span><span>{customerInfo.name || 'Umum'}</span></div>
                </div>

                <div className="text-xs border-b border-dashed border-gray-400 pb-2 mb-2">
                  {items.map((item, i) => (
                    <div key={item.id} className="mb-2">
                      <div className="font-semibold">{item.description || 'Item'}</div>
                      <div className="flex justify-between">
                        <span>{item.quantity} x {formatIDR(item.price)}</span>
                        <span>{formatIDR(item.quantity * item.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-sm font-bold flex justify-between mb-2">
                  <span>TOTAL</span>
                  <span>{formatIDR(total)}</span>
                </div>

                {invoiceDetails.taxPercent > 0 && (
                  <div className="text-xs flex justify-between">
                    <span>Pajak</span>
                    <span>{formatIDR(taxAmount)}</span>
                  </div>
                )}
                {invoiceDetails.discount > 0 && (
                  <div className="text-xs flex justify-between">
                    <span>Diskon</span>
                    <span>-{formatIDR(invoiceDetails.discount)}</span>
                  </div>
                )}

                <div className="text-center mt-6 text-xs whitespace-pre-line">
                  {invoiceDetails.notes || 'Terima Kasih'}
                </div>
                
                {companyInfo.signature && (
                  <div className="mt-8 mb-2 flex flex-col items-center">
                    <img src={companyInfo.signature} alt="Tanda Tangan" className="h-12 object-contain mix-blend-multiply grayscale" />
                    <div className="text-[10px] mt-1 text-gray-500">{companyInfo.signatureName}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------- //
// SETTINGS MODAL COMPONENT 
// -------------------------------------------------------------------------------- //
function SettingsModal({ 
  currentInfo, 
  onSave, 
  onClose 
}: { 
  currentInfo: CompanyInfo; 
  onSave: (info: CompanyInfo) => void; 
  onClose: () => void; 
}) {
  const [tempInfo, setTempInfo] = useState<CompanyInfo>(currentInfo);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran gambar maksimal 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempInfo({ ...tempInfo, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setTempInfo({...tempInfo, signature: null});
  };

  const saveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
       setTempInfo({...tempInfo, signature: sigCanvas.current.toDataURL()});
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
        
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white/95 backdrop-blur z-10">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Identitas Perusahaan
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Logo Upload Section */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <label className="block text-sm font-semibold text-gray-800 mb-3">Logo Perusahaan</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {tempInfo.logo ? (
                  <img src={tempInfo.logo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-gray-400 text-xs text-center px-2">Belum ada logo</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="cursor-pointer bg-white border hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
                  <Upload size={16} /> Pilih Gambar
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                {tempInfo.logo && (
                  <button 
                    onClick={() => setTempInfo({...tempInfo, logo: null})} 
                    className="block text-red-500 text-sm hover:underline font-medium"
                  >
                    Hapus Logo
                  </button>
                )}
                <p className="text-xs text-gray-500">Gunakan format gambar JPG/PNG (Maks: 2MB).</p>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-4">
            <label className="block text-sm font-semibold text-gray-800 mb-3">Tanda Tangan Elektronik</label>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="space-y-2 flex-1">
                <label className="block text-xs font-medium text-gray-600">Nama Penandatangan</label>
                <input 
                  type="text" 
                  value={tempInfo.signatureName} 
                  onChange={e => setTempInfo({...tempInfo, signatureName: e.target.value})}
                  placeholder="Misal: Budi Santoso"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-medium text-gray-600">Goreskan Tanda Tangan</label>
                <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl overflow-hidden relative" style={{ height: 120 }}>
                  {tempInfo.signature && !sigCanvas.current ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                       <img src={tempInfo.signature} className="max-h-full object-contain mb-1" />
                       <button onClick={() => setTempInfo({...tempInfo, signature: null})} className="text-xs text-red-500 underline">Ulangi Tanda Tangan</button>
                     </div>
                  ) : (
                    <>
                      <SignatureCanvas 
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{className: "w-full h-full cursor-crosshair"}}
                        onEnd={() => saveSignature()}
                      />
                      <button 
                         onClick={clearSignature} 
                         className="absolute bottom-2 right-2 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded"
                      >
                        Hapus
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-gray-500">Gambar tanda tangan dengan mouse atau jari.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Perusahaan / Bisnis</label>
              <input 
                type="text" 
                value={tempInfo.name} 
                onChange={e => setTempInfo({...tempInfo, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Kontak</label>
              <input 
                type="email" 
                value={tempInfo.email} 
                onChange={e => setTempInfo({...tempInfo, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Telepon / WhatsApp</label>
              <input 
                type="text" 
                value={tempInfo.phone} 
                onChange={e => setTempInfo({...tempInfo, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat Lengkap Perusahaan</label>
              <textarea 
                rows={3}
                value={tempInfo.address} 
                onChange={e => setTempInfo({...tempInfo, address: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Informasi Rekening Bank / Pembayaran</label>
              <textarea 
                rows={3}
                placeholder="Bank BCA&#10;No Rek: 1234567890&#10;A.N. Nama Anda"
                value={tempInfo.bankDetails} 
                onChange={e => setTempInfo({...tempInfo, bankDetails: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onSave(tempInfo)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-colors"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}
