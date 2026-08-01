import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';
import schoolLogo from '../images/logo.png';

export default function Dashboard() {
  // بيانات الأقساط
  const financialStats = {
    totalRequired: 100000000,
    totalPaid: 65000000,
    totalRemaining: 35000000,
    paidPercentage: 65
  };

  // بيانات الحضور والغياب للـ 3 أيام الأخيرة
  const attendanceStats = {
    beforeYesterday: { percentage: 92, date: '2026/07/30', absentCount: 36, title: 'حضور أول البارحة' },
    yesterday: { percentage: 95, date: '2026/07/31', absentCount: 22, title: 'حضور البارحة' },
    today: { percentage: 96, date: '2026/08/01', absentCount: 18, title: 'حضور اليوم' }
  };

  // بيانات تفصيلية للطلاب الغائبين متضمنة (عدد مرات الغياب الكلية)
  const absentStudentsData = {
    '2026/07/30': [
      { id: 1, name: 'سامر أحمد كريم', grade: 'الأول الابتدائي', class: 'أ', reason: 'بدون عذر', totalAbsentTimes: 6, phone: '07701234567' },
      { id: 2, name: 'مروة علي إبراهيم', grade: 'الثالث الابتدائي', class: 'ب', reason: 'إجازة مرضية', totalAbsentTimes: 2, phone: '07801234567' },
      { id: 3, name: 'حسين جواد كاظم', grade: 'الرابع الابتدائي', class: 'أ', reason: 'بدون عذر', totalAbsentTimes: 5, phone: '07901234567' },
    ],
    '2026/07/31': [
      { id: 1, name: 'عباس فاضل شلش', grade: 'الثاني الابتدائي', class: 'ج', reason: 'بدون عذر', totalAbsentTimes: 7, phone: '07709876543' },
      { id: 2, name: 'فاطمة زهراء مصطفى', grade: 'الخامس الابتدائي', class: 'أ', reason: 'إجازة مرضية', totalAbsentTimes: 1, phone: '07809876543' },
    ],
    '2026/08/01': [
      { id: 1, name: 'كرار حيدر ناصر', grade: 'الأول الابتدائي', class: 'ب', reason: 'بدون عذر', totalAbsentTimes: 4, phone: '07711223344' },
      { id: 2, name: 'نور الهدى حمزة', grade: 'السادس الابتدائي', class: 'أ', reason: 'إجازة رسمية', totalAbsentTimes: 1, phone: '07811223344' },
    ]
  };

  // حالة التحكم بالنافذة المنبثقة
  const [selectedAbsentDay, setSelectedAbsentDay] = useState(null);

  // تبويبات سجل الأحداث
  const [activeTab, setActiveTab] = useState('transfers');

  // سجل النقل
  const transferLogs = [
    { id: 1, studentName: 'أحمد علي حسين', grade: 'الأول الابتدائي', fromClass: 'أ', toClass: 'ب', date: '2026/08/01 - 09:30 ص' },
    { id: 2, studentName: 'زينب حسن جاسم', grade: 'الثاني الابتدائي', fromClass: 'ب', toClass: 'ج', date: '2026/07/28 - 11:15 ص' },
  ];

  // سجل المنقولين والمفصولين
  const statusLogs = [
    { id: 1, studentName: 'حيدر كرار فاضل', grade: 'الثالث الابتدائي', action: 'منقول خارج المدرسة', reason: 'الانتقال لسكن جديد', date: '2026/07/25' },
    { id: 2, studentName: 'محمد جاسم محمد', grade: 'الرابع الابتدائي', action: 'مفصول', reason: 'تجاوز نسبة الغياب الرسمية', date: '2026/07/20' },
  ];

  // حسابات رسم SVG للأقساط
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * financialStats.paidPercentage) / 100;

  // أمر طباعة سجل الغياب
  const handlePrintAbsentReport = () => {
    window.print();
  };

  // دالة رسم دائرة الحضور
  const renderAttendanceCircle = (data, color = '#0866ff') => {
    const smallRadius = 45;
    const smallCircumference = 2 * Math.PI * smallRadius;
    const smallOffset = smallCircumference - (smallCircumference * data.percentage) / 100;

    return (
      <div 
        onClick={() => setSelectedAbsentDay(data)}
        className="card" 
        style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          padding: '15px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
          border: '1px solid #e4e6eb'
        }}
        title="اضغط لعرض سجل الغائبين والطباعة"
      >
        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#1c1e21', fontWeight: 'bold' }}>{data.title}</h4>
        
        <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '5px 0' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={smallRadius} fill="none" stroke="#e4e6eb" strokeWidth="9" />
            <circle
              cx="50" cy="50" r={smallRadius} fill="none" stroke={color} strokeWidth="9"
              strokeDasharray={smallCircumference} strokeDashoffset={smallOffset}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <span style={{ fontSize: '17px', fontWeight: '800', color: color }}>{data.percentage}%</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '12px', color: '#65676b', display: 'block', fontWeight: 'bold' }}>📅 {data.date}</span>
          <span style={{ fontSize: '12px', color: '#dc3545', fontWeight: '800', marginTop: '2px', display: 'block' }}>
            عدد الغائبين: {data.absentCount} طالب
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container" style={{ direction: 'rtl', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 1. الشريط الجانبي */}
      <aside className="sidebar print-hide">
        <div className="sidebar-logo-container">
          <img src={schoolLogo} alt="شعار المدرسة" className="sidebar-logo" />
        </div>

        <nav>
          <ul>
            <li className="active"><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>🏠 الرئيسية</Link></li>
            <li><Link to="/students" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>👨‍🎓 قائمة الطلاب</Link></li>
            <li><Link to="/teachers" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>👨‍🏫 الكادر التدريسي</Link></li>
            <li><Link to="/classes" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>🏫 الصفوف والشعب</Link></li>
            <li><Link to="/timetable" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>📅 الجدول الدراسي</Link></li>
            <li><Link to="/results" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>📊 النتائج والدرجات</Link></li>
          </ul>
        </nav>
      </aside>

      {/* 2. المحتوى الرئيسي */}
      <main className="main-content">
        <header className="topbar print-hide">
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold', color: '#1c1e21' }}>لوحة التحكم الرئيسية</h1>
          <div className="user-profile">أهلاً بك، المدير 👤</div>
        </header>

        {/* 3. دوائر الحضور والغياب */}
        <section className="stats-cards print-hide" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
          {renderAttendanceCircle(attendanceStats.beforeYesterday, "#6c757d")}
          {renderAttendanceCircle(attendanceStats.yesterday, "#17a2b8")}
          {renderAttendanceCircle(attendanceStats.today, "#0866ff")}
        </section>

        {/* 4. الأقساط المالية */}
        <section className="card print-hide" style={{ marginTop: '20px', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '16px', color: '#1c1e21', marginBottom: '20px' }}>💳 الموقف المالي والأقساط الدراسية</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
            
            <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r={radius} fill="none" stroke="#e4e6eb" strokeWidth="16" />
                <circle
                  cx="90" cy="90" r={radius} fill="none" stroke="#0866ff" strokeWidth="16"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" transform="rotate(-90 90 90)"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span style={{ fontSize: '28px', fontWeight: '800', color: '#0866ff', display: 'block', lineHeight: 1 }}>{financialStats.paidPercentage}%</span>
                <span style={{ fontSize: '12px', color: '#65676b', fontWeight: '600', marginTop: '4px', display: 'block' }}>نسبة المسدد</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '250px' }}>
              <div style={financialCardStyle}>
                <span style={{ color: '#65676b', fontSize: '13px' }}>إجمالي الأقساط المطلوبة:</span>
                <strong style={{ fontSize: '15px', color: '#1c1e21' }}>{financialStats.totalRequired.toLocaleString()} د.ع</strong>
              </div>
              <div style={{ ...financialCardStyle, borderRight: '4px solid #0866ff' }}>
                <span style={{ color: '#65676b', fontSize: '13px' }}>المبلغ القابض (المسدد):</span>
                <strong style={{ fontSize: '15px', color: '#0866ff' }}>{financialStats.totalPaid.toLocaleString()} د.ع</strong>
              </div>
              <div style={{ ...financialCardStyle, borderRight: '4px solid #e4e6eb' }}>
                <span style={{ color: '#65676b', fontSize: '13px' }}>المبلغ المتبقي (غير المسدد):</span>
                <strong style={{ fontSize: '15px', color: '#dc3545' }}>{financialStats.totalRemaining.toLocaleString()} د.ع</strong>
              </div>
            </div>

          </div>
        </section>

        {/* 5. سجل الأحداث والتاريخ */}
        <section className="card print-hide" style={{ marginTop: '20px', padding: '25px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', margin: 0, color: '#1c1e21' }}>📜 سجل الأحداث والتاريخ الرسمية</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setActiveTab('transfers')} style={activeTab === 'transfers' ? activeTabStyle : inactiveTabStyle}>🔄 تاريخ النقل بين الشعب</button>
              <button onClick={() => setActiveTab('status')} style={activeTab === 'status' ? activeTabStyle : inactiveTabStyle}>🚪 المفصولين والمنقولين خارجياً</button>
            </div>
          </div>

          {activeTab === 'transfers' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e4e6eb', color: '#65676b', fontSize: '13px' }}>
                  <th style={{ padding: '10px' }}>اسم الطالب</th>
                  <th style={{ padding: '10px' }}>المرحلة</th>
                  <th style={{ padding: '10px' }}>من شعبة</th>
                  <th style={{ padding: '10px' }}>إلى شعبة</th>
                  <th style={{ padding: '10px' }}>تاريخ ووقت النقل 📅</th>
                </tr>
              </thead>
              <tbody>
                {transferLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f2f5', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{log.studentName}</td>
                    <td style={{ padding: '12px' }}>{log.grade}</td>
                    <td style={{ padding: '12px', color: '#dc3545', fontWeight: 'bold' }}>شعبة ({log.fromClass})</td>
                    <td style={{ padding: '12px', color: '#198754', fontWeight: 'bold' }}>شعبة ({log.toClass})</td>
                    <td style={{ padding: '12px', color: '#65676b', fontSize: '13px' }}>{log.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'status' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e4e6eb', color: '#65676b', fontSize: '13px' }}>
                  <th style={{ padding: '10px' }}>اسم الطالب</th>
                  <th style={{ padding: '10px' }}>المرحلة</th>
                  <th style={{ padding: '10px' }}>حالة الإجراء</th>
                  <th style={{ padding: '10px' }}>السبب</th>
                  <th style={{ padding: '10px' }}>تاريخ القرار 📅</th>
                </tr>
              </thead>
              <tbody>
                {statusLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f2f5', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{log.studentName}</td>
                    <td style={{ padding: '12px' }}>{log.grade}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        backgroundColor: log.action === 'مفصول' ? '#ffebe9' : '#e7f3ff', 
                        color: log.action === 'مفصول' ? '#dc3545' : '#0866ff',
                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#65676b' }}>{log.reason}</td>
                    <td style={{ padding: '12px', color: '#65676b', fontSize: '13px' }}>{log.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      </main>

      {/* 6. نافذة سجل الغياب الهيدر الفاخر المخصص للطباعة */}
      {selectedAbsentDay && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="printable-modal">
            
            {/* الهيدر الرسمي المطبوع: مدرسة الكوفة الأهلية بالوسط وبخط عربي فاخر */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0866ff', paddingBottom: '15px', marginBottom: '20px' }}>
              <h1 style={{ 
                fontFamily: "'Amiri', 'Traditional Arabic', 'Segoe UI', Tahoma, sans-serif", 
                fontSize: '28px', 
                fontWeight: 'bold', 
                color: '#0866ff', 
                margin: '0 0 5px 0',
                letterSpacing: '0.5px'
              }}>
                مدرسة الكوفة الأهلية
              </h1>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1c1e21', fontWeight: 'bold' }}>
                📋 التقرير اليومي للطلاب الغائبين
              </h3>
              <span style={{ fontSize: '13px', color: '#65676b', fontWeight: 'bold', backgroundColor: '#f0f2f5', padding: '4px 12px', borderRadius: '12px' }}>
                التاريخ الرسمي: {selectedAbsentDay.date} | {selectedAbsentDay.title}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f2f5', borderBottom: '2px solid #e4e6eb' }}>
                  <th style={{ padding: '10px' }}>#</th>
                  <th style={{ padding: '10px' }}>اسم الطالب الغائب</th>
                  <th style={{ padding: '10px' }}>المرحلة</th>
                  <th style={{ padding: '10px' }}>الشعبة</th>
                  <th style={{ padding: '10px' }}>السبب / الملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {(absentStudentsData[selectedAbsentDay.date] || []).map((student, index) => {
                  const isHighAbsence = student.totalAbsentTimes >= 3;

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid #e4e6eb' }}>
                      <td style={{ padding: '10px' }}>{index + 1}</td>
                      <td style={{ padding: '10px', position: 'relative' }} className="student-name-hover">
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: isHighAbsence ? '#dc3545' : '#1c1e21', 
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {student.name}
                          {isHighAbsence && (
                            <span style={{ backgroundColor: '#ffebe9', color: '#dc3545', fontSize: '10px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>
                              كثير الغياب ⚠️
                            </span>
                          )}
                        </span>

                        <div className="tooltip-card">
                          <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '4px' }}>
                            📊 معلومات الغياب
                          </div>
                          <div>عدد مرات الغياب هذا الشهر: <strong style={{ color: '#dc3545' }}>{student.totalAbsentTimes} مرات</strong></div>
                          <div>هاتف ولي الأمر: <strong>{student.phone}</strong></div>
                        </div>
                      </td>

                      <td style={{ padding: '10px' }}>{student.grade}</td>
                      <td style={{ padding: '10px' }}>شعبة ({student.class})</td>
                      <td style={{ padding: '10px', color: student.reason === 'بدون عذر' ? '#dc3545' : '#0866ff' }}>{student.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ backgroundColor: '#f8f9fa', padding: '10px 15px', borderRadius: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span>إجمالي الغائبين لهذا اليوم: <strong>{selectedAbsentDay.absentCount} طالب</strong></span>
              <span>نسبة الحضور المتبقية: <strong>{selectedAbsentDay.percentage}%</strong></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }} className="print-hide">
              <button onClick={() => setSelectedAbsentDay(null)} style={cancelButtonStyle}>إغلاق</button>
              <button onClick={handlePrintAbsentReport} style={printButtonStyle}>🖨️ طباعة التقرير</button>
            </div>

          </div>
        </div>
      )}

      {/* إعدادات CSS */}
      <style>{`
        .student-name-hover .tooltip-card {
          display: none;
          position: absolute;
          bottom: 100%;
          right: 0;
          background-color: #1c1e21;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .student-name-hover:hover .tooltip-card {
          display: block;
        }

        @page {
          margin: 10mm;
          size: auto;
        }

        @media print {
          body * { visibility: hidden; }
          .printable-modal, .printable-modal * { visibility: visible; }
          .printable-modal { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .print-hide, .tooltip-card { display: none !important; }
        }
      `}</style>

    </div>
  );
}

// التنسيقات العامة
const financialCardStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f2f5', padding: '12px 16px', borderRadius: '8px', gap: '20px'
};

const activeTabStyle = {
  backgroundColor: '#0866ff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
};

const inactiveTabStyle = {
  backgroundColor: '#e4e6eb', color: '#050505', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
};

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '650px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
};

const printButtonStyle = {
  backgroundColor: '#0866ff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
};

const cancelButtonStyle = {
  backgroundColor: '#e4e6eb', color: '#050505', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
};