import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  deleteDoc, setDoc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Home, Users, Trash2, Edit3, Plus, 
  ChevronRight, Heart, AlertTriangle, CheckCircle, 
  Download, Baby, Accessibility, Activity, Syringe,
  Filter, LayoutGrid, List as ListIcon, X, Shield, MapPin,
  UserMinus
} from 'lucide-react';
import { Household, HouseholdMember, UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import XLSStyle from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { getDocs } from 'firebase/firestore';
import { purgeUserAccount } from '../../lib/accountService';

export default function CensusPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'vulnerable' | 'children'>('all');
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    firstSurname: '',
    cedula: '',
    phone: '',
    houseNumber: '',
    street: '',
    medicalConditions: '',
    disability: '',
    householdSize: 1,
    livesAlone: false,
    spouseDetails: { firstName: '', lastName: '', age: 0, cedula: '' },
    childrenDetails: [] as { firstName: string; lastName: string; age: number; cedula?: string }[],
    elderlyDetails: [] as { firstName: string; lastName: string; age: number; cedula: string; condition: string }[],
    clapStatus: 'al_dia' as 'al_dia' | 'pendiente',
    gasStatus: 'al_dia' as 'al_dia' | 'pendiente',
    waterStatus: 'al_dia' as 'al_dia' | 'con_fallas',
  });

  useEffect(() => {
    if (!profile) return;
    
    const usersRef = collection(db, 'users');
    let q;
    if (profile.role === 'admin') {
      // Admins see all users to manage them, including other admins (like Luis) and street leaders
      q = query(usersRef);
    } else {
      // Street leaders see all people on their street (including other roles if any, or just neighbors)
      q = query(usersRef, where('street', '==', profile.street));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(d => ({ ...(d.data() as any), uid: d.id }) as UserProfile)
        .filter(u => u.uid !== profile.uid); // Hide current user from the management list
      setRegisteredUsers(users);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const fetchUserHistory = (userId: string) => {
    // Simulated participation history
    setUserHistory([
      { id: '1', date: '2024-05-15', type: 'Servicio', detail: 'Entrega CLAP Mayo', status: 'Recibido' },
      { id: '2', date: '2024-05-10', type: 'Evento', detail: 'Asamblea de Vecinos', status: 'Asistió' },
      { id: '3', date: '2024-04-20', type: 'Salud', detail: 'Jornada de Vacunación', status: 'Participó' },
    ]);
  };

  const handleEditDetail = (u: UserProfile) => {
    setSelectedUser(u);
    setFormData({
      firstName: u.firstName || '',
      firstSurname: u.firstSurname || '',
      cedula: u.cedula || '',
      phone: u.phone || '',
      houseNumber: u.houseNumber || '',
      street: u.street || profile?.street || '',
      medicalConditions: u.medicalConditions || '',
      disability: u.disability || '',
      householdSize: u.householdSize || 1,
      livesAlone: u.livesAlone || false,
      spouseDetails: u.spouseDetails || { firstName: '', lastName: '', age: 0, cedula: '' },
      childrenDetails: u.childrenDetails || [],
      elderlyDetails: u.elderlyDetails || [],
      clapStatus: u.clapStatus || 'al_dia',
      gasStatus: u.gasStatus || 'al_dia',
      waterStatus: u.waterStatus || 'al_dia',
    });
    // Participation history from the user profile instead of mocks
    setUserHistory(u.participationHistory || []);
    setShowDetailModal(true);
  };

  const handleSaveDetail = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      if (selectedUser.uid.startsWith('NEW_')) {
        // Create new user record (manually added neighbor)
        const newUid = `neighbor_${Date.now()}`;
        await setDoc(doc(db, 'users', newUid), {
          ...formData,
          uid: newUid,
          role: 'vecino',
          email: `${formData.cedula}@fortuna.com`, // dummy email for manual records
          createdAt: serverTimestamp(),
          isBlocked: false,
          censusUpdatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'users', selectedUser.uid), {
          ...formData,
          censusUpdatedAt: serverTimestamp()
        });
      }
      setShowDetailModal(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await purgeUserAccount(userToDelete, false);
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const exportToExcel = () => {
    const activeFilterText = activeTab === 'all' ? 'Todos los Vecinos' : activeTab === 'vulnerable' ? 'Vulnerables / Salud' : 'Niños y Adolescentes';
    const exportDateString = new Date().toLocaleDateString('es-ES');
    
    // Build an Array of Arrays for fine-grained cell placement as requested by the user
    const aoa = [
      ['CENSO DIGITAL COMUNITARIO 2026'],
      ['Comunidad La Fortuna • Vía El Junquito (Entre Km 4 y Km 5)'],
      [`Fecha de Registro: ${exportDateString} • Reporte Oficial del Censo Familiar`],
      [`Filtro Activo: ${activeFilterText}`],
      ['RESUMEN DEMOGRÁFICO DE LA COMUNIDAD'],
      [`Vecinos Registrados: ${stats.total}      Adultos Mayores / Vulnerables: ${stats.vulnerable}      Menores de Edad / Niños: ${stats.children}`],
      [], // blank row
      [
        'Cédula', 
        'Nombre', 
        'Teléfono', 
        'Ubicación (Casa/Calle)', 
        'Carga', 
        'Salud / Obs.',
        'Cónyuge / Pareja',
        'Niños y Adolescentes',
        'Personas Mayores'
      ]
    ];

    // Convert matching/filtered neighbors in real-time
    filtered.forEach(u => {
      const loadText = u.livesAlone ? 'Solo' : `${u.householdSize || 1} p.`;
      
      const healthParts = [];
      if (u.medicalConditions) healthParts.push(u.medicalConditions);
      if (u.disability) healthParts.push(`Disc: ${u.disability}`);
      const healthText = healthParts.join(' / ') || 'Sano';

      const spouseText = u.spouseDetails?.firstName 
        ? `${u.spouseDetails.firstName} ${u.spouseDetails.lastName || ''} (${u.spouseDetails.age || 0}a)${u.spouseDetails.cedula ? ` V-${u.spouseDetails.cedula}` : ''}` 
        : 'N/A';

      const childrenText = (u.childrenDetails || [])
        .map(c => `${c.firstName || ''} ${c.lastName || ''} (${c.age || 0}a)${c.cedula ? ` V-${c.cedula}` : ''}`)
        .join(', ') || 'N/A';

      const elderlyText = (u.elderlyDetails || [])
        .map(e => `${e.firstName || ''} ${e.lastName || ''} (${e.age || 0}a)${e.cedula ? ` V-${e.cedula}` : ''}${e.condition ? ` [${e.condition}]` : ''}`)
        .join(', ') || 'N/A';

      aoa.push([
        `V-${u.cedula}`,
        `${u.firstName || ''} ${u.firstSurname || ''}`,
        u.phone || 'S/N',
        `Casa ${u.houseNumber || 'S/N'}, Cl. ${u.street || 'S/D'}`,
        loadText,
        healthText,
        spouseText,
        childrenText,
        elderlyText
      ]);
    });

    const wb = XLSStyle.utils.book_new();
    const ws = XLSStyle.utils.aoa_to_sheet(aoa);

    // Apply merges so that headers span across the full width of the report nicely (cols A through I)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 8 } }
    ];

    // Set row heights to give cells breathing room (aesthetic spacing)
    ws['!rows'] = [
      { hpt: 28 }, // Row 0: App Title
      { hpt: 18 }, // Row 1: Subtitle
      { hpt: 16 }, // Row 2: Date
      { hpt: 16 }, // Row 3: Active Filter
      { hpt: 20 }, // Row 4: Summary Demographics title
      { hpt: 22 }, // Row 5: Summary Demographics metrics
      { hpt: 10 }, // Row 6: Blank row spacer
      { hpt: 26 }, // Row 7: Data headers (green)
    ];

    // Style the sheet cells nicely!
    for (const key in ws) {
      if (key.startsWith('!')) continue;
      const cell = ws[key];
      const match = key.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) continue;
      
      const colLetter = match[1];
      const rowNum = parseInt(match[2], 10) - 1; // 0-indexed row
      
      let colIndex = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
      }
      colIndex = colIndex - 1;

      // Default light Segoe UI configuration
      cell.s = {
        font: { name: 'Segoe UI', sz: 10 },
        alignment: { vertical: 'center' }
      };

      if (rowNum === 0) {
        // App Title Cell
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: '0F172A' } }; // Slate-900
        cell.s.font = { name: 'Segoe UI', sz: 13, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (rowNum === 1) {
        // Subtitle Community Name
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
        cell.s.font = { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '9CA3AF' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (rowNum === 2) {
        // Date details
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
        cell.s.font = { name: 'Segoe UI', sz: 9, color: { rgb: 'E5E7EB' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (rowNum === 3) {
        // Active Filter
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
        cell.s.font = { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '34D399' } }; // Emerald text highlight
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (rowNum === 4) {
        // Demographics Header Label
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }; // Slate-100
        cell.s.font = { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '1E293B' } };
        cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        cell.s.border = {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } }
        };
      } else if (rowNum === 5) {
        // Demographics values metrics
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }; // Slate-50
        cell.s.font = { name: 'Segoe UI', sz: 9, color: { rgb: '334155' } };
        cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        cell.s.border = {
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }
        };
      } else if (rowNum === 7) {
        // Main Columns Header Cell
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: '10B981' } }; // emerald-500
        cell.s.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        cell.s.border = {
          top: { style: 'medium', color: { rgb: '047857' } },
          bottom: { style: 'medium', color: { rgb: '047857' } }
        };
      } else if (rowNum > 7) {
        // Neighbors record rows (zebra style)
        const isAlternate = (rowNum % 2 !== 0);
        cell.s.fill = { 
          patternType: 'solid', 
          fgColor: { rgb: isAlternate ? 'F8FAFC' : 'FFFFFF' } // alternate zebra
        };
        cell.s.font = { name: 'Segoe UI', sz: 9, color: { rgb: '1E293B' } };
        
        // Alignment
        cell.s.alignment = { 
          horizontal: colIndex === 0 || colIndex === 2 || colIndex === 4 ? 'center' : 'left', // Center Cédula, teléfono, carga
          vertical: 'center',
          wrapText: true 
        };
        // Thin subtle borders around cells
        cell.s.border = {
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'F1F5F9' } },
          right: { style: 'thin', color: { rgb: 'F1F5F9' } }
        };
      }
    }

    // Apply custom column widths
    ws['!cols'] = [
      { wch: 15 }, // Cédula
      { wch: 25 }, // Nombre
      { wch: 15 }, // Teléfono
      { wch: 30 }, // Ubicación
      { wch: 12 }, // Carga
      { wch: 25 }, // Salud / Obs
      { wch: 30 }, // Cónyuge
      { wch: 40 }, // Niños
      { wch: 40 }  // Mayores
    ];

    XLSStyle.utils.book_append_sheet(wb, ws, 'CENSO COMUNITARIO');

    const fileName = `CENSO_LA_FORTUNA_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSStyle.writeFile(wb, fileName);
  };

  const exportToPDF = () => {
    // Landscape A4 orientation to fit the full columns comfortably
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Header banner with modern slate theme
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 42, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CENSO DIGITAL COMUNITARIO 2026', 15, 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text('Comunidad La Fortuna • Vía El Junquito (Entre Km 4 y Km 5)', 15, 23);
    doc.text(`Fecha de Registro: ${new Date().toLocaleDateString('es-ES')} • Reporte Oficial del Censo Familiar`, 15, 29);
    doc.text(`Filtro Activo: ${activeTab === 'all' ? 'Todos los Vecinos' : activeTab === 'vulnerable' ? 'Vulnerables / Salud' : 'Niños y Adolescentes'}`, 15, 35);
    
    // Stats overview card widened for landscape
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 49, 267, 22, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(15, 49, 267, 22, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('RESUMEN DEMOGRÁFICO DE LA COMUNIDAD', 20, 55);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Vecinos Registrados: ${stats.total}`, 20, 63);
    doc.text(`Adultos Mayores / Vulnerables: ${stats.vulnerable}`, 90, 63);
    doc.text(`Menores de Edad / Niños: ${stats.children}`, 170, 63);

    // Grid columns and rows in Spanish with spouse/children/elderly
    const tableColumn = [
      "Cédula", 
      "Nombre", 
      "Teléfono", 
      "Ubicación (Casa/Calle)", 
      "Carga", 
      "Salud / Obs.",
      "Cónyuge / Pareja",
      "Niños y Adolescentes",
      "Personas Mayores"
    ];
    const tableRows: any[] = [];

    // Use current active filter (filtered list)
    const listToExport = filtered;

    listToExport.forEach(u => {
      const loadText = u.livesAlone ? 'Solo' : `${u.householdSize || 1} p.`;
      
      const healthParts = [];
      if (u.medicalConditions) healthParts.push(u.medicalConditions);
      if (u.disability) healthParts.push(`Disc: ${u.disability}`);
      const healthText = healthParts.join(' / ') || 'Sano';

      const spouseText = u.spouseDetails?.firstName 
        ? `${u.spouseDetails.firstName} ${u.spouseDetails.lastName || ''} (${u.spouseDetails.age || 0}a)${u.spouseDetails.cedula ? ` V-${u.spouseDetails.cedula}` : ''}` 
        : 'N/A';

      const childrenText = (u.childrenDetails || [])
        .map(c => `${c.firstName || ''} ${c.lastName || ''} (${c.age || 0}a)${c.cedula ? ` V-${c.cedula}` : ''}`)
        .join(', ') || 'N/A';

      const elderlyText = (u.elderlyDetails || [])
        .map(e => `${e.firstName || ''} ${e.lastName || ''} (${e.age || 0}a)${e.cedula ? ` V-${e.cedula}` : ''}${e.condition ? ` [${e.condition}]` : ''}`)
        .join(', ') || 'N/A';
      
      const rowData = [
        `V-${u.cedula}`,
        `${u.firstName || ''} ${u.firstSurname || ''}`,
        u.phone || 'S/N',
        `Casa ${u.houseNumber || 'S/N'}, Cl. ${u.street || 'S/D'}`,
        loadText,
        healthText,
        spouseText,
        childrenText,
        elderlyText
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 78,
      theme: 'striped',
      headStyles: { 
        fillColor: [16, 185, 129], // emerald-500
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left'
      },
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 28 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 12 },
        5: { cellWidth: 30 },
        6: { cellWidth: 32 },
        7: { cellWidth: 46 },
        8: { cellWidth: 46 }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          'Documento oficial para uso exclusivo de la Junta Comunal de La Fortuna de El Junquito.',
          15,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Página ${data.pageNumber}`,
          doc.internal.pageSize.width - 28,
          doc.internal.pageSize.height - 10
        );
      }
    });

    const fileName = `CENSO_LA_FORTUNA_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const filtered = registeredUsers.filter(u => {
    // Only show neighbors, hide admins and street leaders from the management view list as requested
    const isNeighbor = u.role === 'vecino' || !u.role;
    if (!isNeighbor) return false;

    const searchMatch = `${u.firstName} ${u.firstSurname}`.toLowerCase().includes(search.toLowerCase()) || 
                      u.cedula.includes(search) || 
                      u.houseNumber.includes(search);
    
    if (!searchMatch) return false;
    
    if (activeTab === 'vulnerable') return u.age > 65 || u.medicalConditions || u.disability || u.livesAlone || (u.elderlyDetails?.length || 0) > 0;
    if (activeTab === 'children') return (u.childrenDetails?.length || 0) > 0 || u.age < 18;
    return true;
  });

  const stats = {
    total: registeredUsers.filter(u => u.role === 'vecino' || !u.role).length,
    vulnerable: registeredUsers.filter(u => (u.role === 'vecino' || !u.role) && (u.age > 65 || u.medicalConditions || u.disability || u.livesAlone || (u.elderlyDetails?.length || 0) > 0)).length,
    children: registeredUsers.filter(u => (u.role === 'vecino' || !u.role) && ((u.childrenDetails?.length || 0) > 0 || u.age < 18)).length,
    unregistered: 0 
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'jefe_calle';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto pb-20 print:hidden">
      <AnimatePresence>
        {profile?.role === 'admin' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-slate-900 px-10 py-3 flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Censo 2026: Registro Electoral y Social</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold italic">Supervisión administrativa de perfiles</span>
          </motion.div>
        )}
        {profile?.role === 'jefe_calle' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-emerald-600 px-10 py-3 flex items-center justify-between text-white shadow-xl shadow-emerald-500/10"
          >
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-200" />
              <span className="text-[10px] font-black uppercase tracking-widest">Gestión de Censo: Calle {profile.street}</span>
            </div>
            <span className="text-[9px] text-emerald-100 font-bold italic">Recuerda mantener actualizados los perfiles de tu calle</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="w-full md:w-auto">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 inline-block shadow-sm">
            Censo Digital La Fortuna 2026
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4 w-fit">
            {[
              { id: 'all', label: 'Todos los Vecinos' },
              { id: 'vulnerable', label: 'Vulnerables / Salud' },
              { id: 'children', label: 'Niños y Adolescentes' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === tab.id ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Censo Comunitario 2026</h2>
          <p className="text-slate-500 text-sm font-medium italic">Gestión de perfiles familiares y sociales</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar por nombre, casa o cédula..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 bg-white w-full text-sm shadow-sm outline-none transition-all"
            />
          </div>
          <button 
            onClick={exportToExcel} 
            className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 rounded-2xl transition-all shadow-sm font-black uppercase text-[10px] tracking-wider group"
            title="Descargar censo en formato Excel"
          >
            <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
            <span>Excel</span>
          </button>
          
          <button 
            onClick={exportToPDF} 
            className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-sm font-black uppercase text-[10px] tracking-wider group"
            title="Descargar censo en formato PDF"
          >
            <Download size={14} className="group-hover:translate-y-0.5 transition-transform text-emerald-400" />
            <span>Descargar PDF</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => {
                const dummy: UserProfile = { 
                  uid: `NEW_${Date.now()}`, 
                  firstName: '', 
                  firstSurname: '', 
                  cedula: '', 
                  phone: '', 
                  age: 0, 
                  street: profile?.street || '', 
                  houseNumber: '', 
                  gender: 'Masculino', 
                  role: 'vecino',
                  email: '',
                  createdAt: new Date().toISOString(),
                  isBlocked: false
                };
                handleEditDetail(dummy);
              }} 
              className="btn-primary px-8"
            >
              <Plus size={20} />
              <span>Registrar Vecino</span>
            </button>
          )}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-xl transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-xl transition-all", viewMode === 'list' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}>
              <ListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registrados', val: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'En Censo', val: stats.total, icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Vulnerables', val: stats.vulnerable, icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Menores', val: stats.children, icon: Baby, color: 'text-amber-500', bg: 'bg-amber-50' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", s.bg, s.color)}>
              <s.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{s.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-4">
          <Users className="mx-auto text-slate-200" size={64} />
          <p className="text-slate-400 font-bold italic">No hay vecinos que coincidan con tu búsqueda.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(u => (
            <motion.div 
              layout 
              key={u.uid}
              onClick={() => handleEditDetail(u)}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-emerald-200/20 hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden bg-slate-100 shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-black text-slate-400">{u.firstName[0]}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none border-b-2 border-emerald-300 inline-block mb-1">{u.firstName} {u.firstSurname}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Casa #{u.houseNumber} - {u.street}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-col items-end">
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-lg font-black uppercase">V-{u.cedula}</span>
                  {u.disability && <Accessibility size={14} className="text-red-500" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Carga Familiar</p>
                  <p className="text-sm font-bold text-slate-700">
                    {u.livesAlone ? 'Vive solo(a)' : `${u.householdSize || 1} integrantes`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {u.childrenDetails?.length ? <span className="text-[7px] bg-sky-100 text-sky-600 px-1 rounded-sm font-black uppercase">Niños: {u.childrenDetails.length}</span> : null}
                    {u.elderlyDetails?.length ? <span className="text-[7px] bg-amber-100 text-amber-700 px-1 rounded-sm font-black uppercase">Abuelos: {u.elderlyDetails.length}</span> : null}
                    {u.spouseDetails?.firstName ? <span className="text-[7px] bg-red-100 text-red-600 px-1 rounded-sm font-black uppercase">Pareja</span> : null}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Salud / Vulnerabilidad</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{u.medicalConditions || 'Sin reporte'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Verificado Comunitario</span>
                </div>
                <div className="text-[9px] font-bold text-slate-400 italic">Historial Disponible</div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                <th className="px-8 py-5">Identidad</th>
                <th className="px-8 py-5">Ubicación</th>
                <th className="px-8 py-5">Carga Familiar</th>
                <th className="px-8 py-5">Vulnerabilidad</th>
                <th className="px-8 py-5 text-right">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(u => (
                <tr key={u.uid} onClick={() => handleEditDetail(u)} className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden">
                        {u.photoUrl ? <img src={u.photoUrl} alt="" className="w-full h-full object-cover" /> : u.firstName[0]}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 leading-none">{u.firstName} {u.firstSurname}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">V-{u.cedula} • {u.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <p className="font-bold text-slate-700 text-sm">Calle {u.street}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Casa #{u.houseNumber}</p>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-lg font-black">{u.householdSize || 1} Personas</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-1 rounded-lg",
                      u.medicalConditions ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    )}>
                      {u.medicalConditions ? 'Vulnerable' : 'Estable'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Profil/Census Management Modal */}
      <AnimatePresence>
        {showDetailModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-5xl w-full rounded-[3rem] shadow-2xl relative my-auto p-1 text-slate-900"
            >
              <div className="p-8 md:p-12 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-[2rem] bg-slate-100 overflow-hidden shadow-2xl border-4 border-white shrink-0">
                      {selectedUser.photoUrl ? (
                        <img src={selectedUser.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">{selectedUser.firstName[0]}</div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-4xl font-black tracking-tighter leading-none mb-2">
                        {selectedUser.firstName} {selectedUser.firstSurname}
                      </h3>
                      <div className="flex gap-2 items-center">
                        <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">{selectedUser.role === 'admin' ? 'Coordinador' : 'Vecino Registrado'}</span>
                        <span className="text-slate-400 text-xs font-bold font-mono">V-{selectedUser.cedula}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => { setUserToDelete(selectedUser.uid); setShowDeleteModal(true); }}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={24} />
                      </button>
                    )}
                    <button onClick={() => setShowDetailModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Información Personal y Censo</h4>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Nombre</label>
                              <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                value={formData.firstName}
                                onChange={e => setFormData({...formData, firstName: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Apellido</label>
                              <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                value={formData.firstSurname}
                                onChange={e => setFormData({...formData, firstSurname: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Cédula</label>
                              <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                value={formData.cedula}
                                onChange={e => setFormData({...formData, cedula: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Teléfono</label>
                              <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Calle</label>
                              <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                value={formData.street}
                                onChange={e => setFormData({...formData, street: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Casa #</label>
                              <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                value={formData.houseNumber}
                                onChange={e => setFormData({...formData, houseNumber: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Home size={14} /> ¿Vive solo(a)?
                              </label>
                              <p className="text-[10px] text-slate-500 font-bold">Marque si no hay más integrantes</p>
                            </div>
                            <button 
                              onClick={() => setFormData({...formData, livesAlone: !formData.livesAlone, childrenDetails: [], elderlyDetails: [], spouseDetails: { firstName: '', lastName: '', age: 0, cedula: '' }, householdSize: 1})}
                              className={cn(
                                "w-12 h-6 rounded-full transition-all relative px-1 flex items-center",
                                formData.livesAlone ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"
                              )}
                            >
                              <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-tight flex items-center gap-2">
                                  <Users size={14} /> Carga Familiar (Integrantes)
                                </label>
                                <input 
                                  type="number"
                                  min={formData.livesAlone ? 1 : 1}
                                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                                  value={formData.householdSize}
                                  onChange={e => setFormData({...formData, householdSize: parseInt(e.target.value) || 1})}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-tight flex items-center gap-2">
                              <Syringe size={14} /> Patologías / Enfermedades Crónicas (Titular)
                            </label>
                            <textarea 
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:border-emerald-500 outline-none transition-all resize-none"
                              rows={2}
                              placeholder="Diabetes, Hipertensión, etc... (Deje vacío si no aplica)"
                              value={formData.medicalConditions}
                              onChange={e => setFormData({...formData, medicalConditions: e.target.value})}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-tight flex items-center gap-2">
                              <Accessibility size={14} /> Discapacidad / Necesidad Especial (Titular)
                            </label>
                            <textarea 
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:border-emerald-500 outline-none transition-all resize-none"
                              rows={2}
                              placeholder="Física, Visual, Cognitiva, etc. Deje vacío si no aplica"
                              value={formData.disability}
                              onChange={e => setFormData({...formData, disability: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Núcleo Familiar Detallado</h4>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Actualizado</span>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Heart size={14} className="text-red-400" /> Cónyuge / Pareja
                              </label>
                              {!formData.spouseDetails.firstName && (
                                <span className="text-[9px] text-slate-400 font-bold italic">No registrado</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                placeholder="Nombres"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-emerald-500 outline-none"
                                value={formData.spouseDetails.firstName}
                                onChange={e => setFormData({...formData, spouseDetails: {...formData.spouseDetails, firstName: e.target.value}, livesAlone: false})}
                              />
                              <input 
                                placeholder="Apellidos"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-emerald-500 outline-none"
                                value={formData.spouseDetails.lastName}
                                onChange={e => setFormData({...formData, spouseDetails: {...formData.spouseDetails, lastName: e.target.value}, livesAlone: false})}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number"
                                placeholder="Edad"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-emerald-500 outline-none"
                                value={formData.spouseDetails.age || ''}
                                onChange={e => setFormData({...formData, spouseDetails: {...formData.spouseDetails, age: parseInt(e.target.value) || 0}, livesAlone: false})}
                              />
                              <input 
                                placeholder="Cédula"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-emerald-500 outline-none"
                                value={formData.spouseDetails.cedula}
                                onChange={e => setFormData({...formData, spouseDetails: {...formData.spouseDetails, cedula: e.target.value}, livesAlone: false})}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Baby size={16} className="text-sky-500" /> Niños y Adolescentes
                              </label>
                              <button 
                                onClick={() => setFormData({...formData, childrenDetails: [...formData.childrenDetails, { firstName: '', lastName: '', age: 0, cedula: '' }], livesAlone: false})}
                                className="w-6 h-6 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            {formData.childrenDetails.map((child, idx) => (
                              <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl space-y-2 animate-in slide-in-from-left-1 transition-all">
                                <div className="flex gap-2">
                                  <input 
                                    placeholder="Nombre"
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:bg-white"
                                    value={child.firstName}
                                    onChange={e => {
                                      const newArr = [...formData.childrenDetails];
                                      newArr[idx].firstName = e.target.value;
                                      setFormData({...formData, childrenDetails: newArr});
                                    }}
                                  />
                                  <input 
                                    placeholder="Apellido"
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:bg-white"
                                    value={child.lastName}
                                    onChange={e => {
                                      const newArr = [...formData.childrenDetails];
                                      newArr[idx].lastName = e.target.value;
                                      setFormData({...formData, childrenDetails: newArr});
                                    }}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Edad"
                                    className="w-16 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:bg-white"
                                    value={child.age || ''}
                                    onChange={e => {
                                      const newArr = [...formData.childrenDetails];
                                      newArr[idx].age = parseInt(e.target.value) || 0;
                                      setFormData({...formData, childrenDetails: newArr});
                                    }}
                                  />
                                  <input 
                                    placeholder="Cédula (Opcional)"
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:bg-white"
                                    value={child.cedula}
                                    onChange={e => {
                                      const newArr = [...formData.childrenDetails];
                                      newArr[idx].cedula = e.target.value;
                                      setFormData({...formData, childrenDetails: newArr});
                                    }}
                                  />
                                  <button 
                                    onClick={() => setFormData({...formData, childrenDetails: formData.childrenDetails.filter((_, i) => i !== idx)})}
                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <UserMinus size={16} className="text-amber-500" /> Personas Mayores
                              </label>
                              <button 
                                onClick={() => setFormData({...formData, elderlyDetails: [...formData.elderlyDetails, { firstName: '', lastName: '', age: 0, cedula: '', condition: '' }], livesAlone: false})}
                                className="w-6 h-6 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            {formData.elderlyDetails.map((eld, idx) => (
                              <div key={idx} className="space-y-2 p-3 bg-amber-50/50 border border-amber-100 rounded-2xl animate-in slide-in-from-left-2 transition-all">
                                <div className="flex gap-2">
                                  <input 
                                    placeholder="Nombre"
                                    className="flex-1 bg-white border border-amber-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-amber-400"
                                    value={eld.firstName}
                                    onChange={e => {
                                      const newArr = [...formData.elderlyDetails];
                                      newArr[idx].firstName = e.target.value;
                                      setFormData({...formData, elderlyDetails: newArr});
                                    }}
                                  />
                                  <input 
                                    placeholder="Apellido"
                                    className="flex-1 bg-white border border-amber-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-amber-400"
                                    value={eld.lastName}
                                    onChange={e => {
                                      const newArr = [...formData.elderlyDetails];
                                      newArr[idx].lastName = e.target.value;
                                      setFormData({...formData, elderlyDetails: newArr});
                                    }}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Edad"
                                    className="w-16 bg-white border border-amber-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-amber-400 text-center"
                                    value={eld.age || ''}
                                    onChange={e => {
                                      const newArr = [...formData.elderlyDetails];
                                      newArr[idx].age = parseInt(e.target.value) || 0;
                                      setFormData({...formData, elderlyDetails: newArr});
                                    }}
                                  />
                                  <input 
                                    placeholder="Cedula"
                                    className="flex-1 bg-white border border-amber-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-amber-400"
                                    value={eld.cedula}
                                    onChange={e => {
                                      const newArr = [...formData.elderlyDetails];
                                      newArr[idx].cedula = e.target.value;
                                      setFormData({...formData, elderlyDetails: newArr});
                                    }}
                                  />
                                </div>
                                <input 
                                  placeholder="Condición / Enfermedad"
                                  className="w-full bg-white border border-amber-100 rounded-xl px-3 py-1.5 text-[10px] font-black text-amber-800 uppercase outline-none"
                                  value={eld.condition}
                                  onChange={e => {
                                    const newArr = [...formData.elderlyDetails];
                                    newArr[idx].condition = e.target.value;
                                    setFormData({...formData, elderlyDetails: newArr});
                                  }}
                                />
                                <button 
                                  onClick={() => setFormData({...formData, elderlyDetails: formData.elderlyDetails.filter((_, i) => i !== idx)})}
                                  className="text-[9px] font-black text-red-500 uppercase mt-1 hover:underline"
                                >
                                  Eliminar Registro
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                       <button 
                        onClick={handleSaveDetail}
                        disabled={loading}
                        className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black shadow-2xl shadow-emerald-500/20 hover:bg-emerald-500 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs"
                      >
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <CheckCircle size={20} />}
                        Actualizar Censo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 h-fit">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Ficha Resumen Comunitaria</p>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <MapPin size={20} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Ubicación</p>
                            <p className="text-sm font-bold text-slate-700">Calle {selectedUser.street}</p>
                            <p className="text-[10px] font-bold text-slate-400">Casa #{selectedUser.houseNumber}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <Shield size={20} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Documentación</p>
                            <p className="text-sm font-bold text-slate-700">V-{selectedUser.cedula}</p>
                            <p className="text-[10px] font-bold text-slate-400">Identidad Verificada</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Registro Digital</p>
                            <p className="text-sm font-bold text-slate-700">Auditado 2026</p>
                            <p className="text-[10px] font-bold text-slate-400">Desde {selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : 'Mayo 2026'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="¿Eliminar vecino y todos sus registros?"
        message="Esta acción eliminará de forma permanente al vecino de la base de datos comunitaria, borrando su ficha del censo y removiendo todas sus inscripciones en eventos y votos en encuestas para que el usuario deje de existir en el sistema. ¿Deseas continuar?"
        onConfirm={handleDeleteUser}
        onCancel={() => { setShowDeleteModal(false); setUserToDelete(null); }}
      />

      <AnimatePresence>
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase tracking-widest flex items-center gap-3 border border-emerald-500/30"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
            Censo Actualizado
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECCIÓN IMPRIMIBLE EXCLUSIVA PARA EXPORTACIÓN A PDF */}
      <div className="print-section bg-white text-slate-900 p-6 font-sans text-xs min-h-screen">
        <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Consejo Comunal La Fortuna</h1>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 mt-1">Censo Comunitario & Registro Social de Hogares 2026</p>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Generado el: {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE')}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded">VISTA COMPLETA DE REGISTROS</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
          <div className="text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Vecinos Censados</span>
            <span className="text-lg font-black text-slate-900">{stats.total}</span>
          </div>
          <div className="text-center border-x border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Personas Vulnerables</span>
            <span className="text-lg font-black text-red-600">{stats.vulnerable}</span>
          </div>
          <div className="text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Menores de Edad</span>
            <span className="text-lg font-black text-amber-600">{stats.children}</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-[9px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-300">
              <th className="border border-slate-300 px-2 py-2 text-center w-8">#</th>
              <th className="border border-slate-300 px-3 py-2">Vecino / Identidad</th>
              <th className="border border-slate-300 px-3 py-2">Ubicación</th>
              <th className="border border-slate-300 px-3 py-2">Contacto</th>
              <th className="border border-slate-300 px-3 py-2">Grupo Familiar Completo</th>
              <th className="border border-slate-300 px-3 py-2">Vulnerabilidad / Salud</th>
              <th className="border border-slate-300 px-2 py-2 text-center">Servicios Públicos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {registeredUsers.filter(u => u.role === 'vecino' || !u.role).map((u, index) => (
              <tr key={u.uid} className="text-[10px] odd:bg-white even:bg-slate-50/50">
                <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-500">{index + 1}</td>
                <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">
                  <span className="block uppercase whitespace-nowrap">{u.firstName} {u.firstSurname}</span>
                  <span className="text-[8px] font-mono font-bold text-slate-500">V-{u.cedula} {u.age ? `(${u.age} años)` : ''}</span>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">
                  <span className="block font-semibold">Calle {u.street || 'General'}</span>
                  <span className="text-[9px] text-slate-500">Casa #{u.houseNumber}</span>
                </td>
                <td className="border border-slate-300 px-3 py-2 font-mono text-slate-700">{u.phone || 'N/A'}</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-850">
                  <span className="block font-bold mb-1">{u.livesAlone ? 'Solo' : `Total Familia: ${u.householdSize || 1}`}</span>
                  <div className="text-[8px] text-slate-600 space-y-0.5">
                    {u.spouseDetails?.firstName && (
                      <span className="block">👩‍❤️‍👨 Cónyuge: {u.spouseDetails.firstName} {u.spouseDetails.lastName || ''} {u.spouseDetails.age ? `(${u.spouseDetails.age}a)` : ''}{u.spouseDetails.cedula ? ` V-${u.spouseDetails.cedula}` : ''}</span>
                    )}
                    {(u.childrenDetails || []).length > 0 && (
                      <span className="block">🧒 Hijos/Menores: {(u.childrenDetails || []).map(c => `${c.firstName || ''} (${c.age || 0}a)`).join(', ')}</span>
                    )}
                    {(u.elderlyDetails || []).length > 0 && (
                      <span className="block">👴 Adultos Mayores: {(u.elderlyDetails || []).map(e => `${e.firstName || ''} (${e.age || 0}a)`).join(', ')}</span>
                    )}
                  </div>
                </td>
                <td className="border border-slate-300 px-3 py-2 leading-relaxed text-slate-700">
                  {u.medicalConditions ? (
                    <div><span className="font-semibold text-red-700">Patología: </span>{u.medicalConditions}</div>
                  ) : null}
                  {u.disability ? (
                    <div className="mt-0.5"><span className="text-[8px] text-red-650 font-bold uppercase">Discapacidad: </span>{u.disability}</div>
                  ) : null}
                  {!u.medicalConditions && !u.disability && <span className="text-slate-400">Ninguna</span>}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-[8px] text-center whitespace-nowrap">
                  <div className="font-bold">CLAP: <span className={u.clapStatus === 'al_dia' ? 'text-emerald-700' : 'text-amber-700'}>{u.clapStatus === 'al_dia' ? 'Al Día' : 'Pendiente'}</span></div>
                  <div className="font-bold">Gas: <span className={u.gasStatus === 'al_dia' ? 'text-emerald-700' : 'text-amber-700'}>{u.gasStatus === 'al_dia' ? 'Al Día' : 'Pendiente'}</span></div>
                  <div className="font-bold">Agua: <span className={u.waterStatus === 'al_dia' ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}>{u.waterStatus === 'al_dia' ? 'Al Día' : 'Con Fallas'}</span></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 pt-8 border-t border-dashed border-slate-400 grid grid-cols-2 gap-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <div className="space-y-12">
            <div className="h-0.5 w-48 bg-slate-300 mx-auto" />
            <p>Firma del Coordinador de Calle / Administrador</p>
          </div>
          <div className="space-y-12">
            <div className="h-0.5 w-48 bg-slate-300 mx-auto" />
            <p>Sello de Recepción / Fecha de Entrega</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
