import React, { useState } from 'react';
import '../styles/Dashboard.css';
export default function Students() {
  const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  const initialStudents = [
    { id: 1, firstName: 'أحمد', fatherName: 'علي', grandfatherName: 'حسين', fourthName: 'كريم', surname: 'الربيعي', fullName: 'أحمد علي حسين كريم الربيعي', gender: 'طالب', grade: 'الأول الابتدائي', fatherPhone: '07801234567', motherPhone: '07701112223', address: 'النجف - حي الأسطى', photoUrl: defaultAvatar, documentUrl: '', notes: 'طالب مجتهد.' },
    { id: 2, firstName: 'حسين', fatherName: 'جواد', grandfatherName: 'كاظم', fourthName: 'هادي', surname: 'الشمري', fullName: 'حسين جواد كاظم هادي الشمري', gender: 'طالب', grade: 'الرابع الابتدائي', fatherPhone: '07901234567', motherPhone: '', address: 'النجف - الحويش', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 3, firstName: 'عباس', fatherName: 'فاضل', grandfatherName: 'شلش', fourthName: '', surname: 'العتبي', fullName: 'عباس فاضل شلش العتبي', gender: 'طالب', grade: 'الثاني الابتدائي', fatherPhone: '07709876543', motherPhone: '07801112224', address: 'النجف - شارع ميسان', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 4, firstName: 'محمد', fatherName: 'رضا', grandfatherName: 'باقر', fourthName: 'مهدي', surname: 'الجابري', fullName: 'محمد رضا باقر مهدي الجابري', gender: 'طالب', grade: 'الثالث الابتدائي', fatherPhone: '07811223344', motherPhone: '', address: 'النجف - حي العانات', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 5, firstName: 'علي', fatherName: 'كرار', grandfatherName: 'صادق', fourthName: '', surname: 'السلامي', fullName: 'علي كرار صادق السلامي', gender: 'طالب', grade: 'الخامس الابتدائي', fatherPhone: '07722334455', motherPhone: '07822334455', address: 'النجف - الجمعية', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 6, firstName: 'حسن', fatherName: 'ميثم', grandfatherName: 'عيسى', fourthName: 'سليم', surname: 'الفتلاوي', fullName: 'حسن ميثم عيسى سليم الفتلاوي', gender: 'طالب', grade: 'السادس الابتدائي', fatherPhone: '07933445566', motherPhone: '', address: 'النجف - شارع المطار', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 7, firstName: 'مصطفى', fatherName: 'حيدر', grandfatherName: 'قاسم', fourthName: '', surname: 'الكناني', fullName: 'مصطفى حيدر قاسم الكناني', gender: 'طالب', grade: 'الأول الابتدائي', fatherPhone: '07744556677', motherPhone: '07844556677', address: 'النجف - الإسكان', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 8, firstName: 'سجاد', fatherName: 'أحمد', grandfatherName: 'مالك', fourthName: 'عبد', surname: 'التميمي', fullName: 'سجاد أحمد مالك عبد التميمي', gender: 'طالب', grade: 'الثاني الابتدائي', fatherPhone: '07855667788', motherPhone: '', address: 'النجف - المثنى', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 9, firstName: 'باقر', fatherName: 'محمد', grandfatherName: 'صالح', fourthName: '', surname: 'الخفاجي', fullName: 'باقر محمد صالح الخفاجي', gender: 'طالب', grade: 'الثالث الابتدائي', fatherPhone: '07766778899', motherPhone: '07866778899', address: 'النجف - الغدير', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 10, firstName: 'منتظر', fatherName: 'سامي', grandfatherName: 'نبيل', fourthName: '', surname: 'الساعدي', fullName: 'منتظر سامي نبيل الساعدي', gender: 'طالب', grade: 'الرابع الابتدائي', fatherPhone: '07977889900', motherPhone: '', address: 'النجف - ميلاد', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 11, firstName: 'فاطمة', fatherName: 'حسن', grandfatherName: 'جاسم', fourthName: '', surname: 'العامري', fullName: 'فاطمة حسن جاسم العامري', gender: 'طالبة', grade: 'الثاني الابتدائي', fatherPhone: '07709876543', motherPhone: '', address: 'النجف - شارع المدينة', photoUrl: defaultAvatar, documentUrl: '', notes: 'ممتازة في القراءة.' },
    { id: 12, firstName: 'زهراء', fatherName: 'مصطفى', grandfatherName: 'عبدالله', fourthName: 'كاظم', surname: 'الساعدي', fullName: 'زهراء مصطفى عبدالله كاظم الساعدي', gender: 'طالبة', grade: 'الخامس الابتدائي', fatherPhone: '07812345678', motherPhone: '07712345678', address: 'النجف - حي السلام', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 13, firstName: 'زينب', fatherName: 'خالد', grandfatherName: 'محمود', fourthName: '', surname: 'الدجيلي', fullName: 'زينب خالد محمود الدجيلي', gender: 'طالبة', grade: 'الأول الابتدائي', fatherPhone: '07923456789', motherPhone: '', address: 'النجف - الحنانة', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 14, firstName: 'مريم', fatherName: 'حبيب', grandfatherName: 'صاحب', fourthName: '', surname: 'الياسري', fullName: 'مريم حبيب صاحب الياسري', gender: 'طالبة', grade: 'السادس الابتدائي', fatherPhone: '07734567890', motherPhone: '07834567890', address: 'النجف - العباسية', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 15, firstName: 'رقية', fatherName: 'عمار', grandfatherName: 'فهد', fourthName: '', surname: 'الاسدي', fullName: 'رقية عمار فهد الاسدي', gender: 'طالبة', grade: 'الثالث الابتدائي', fatherPhone: '07845678901', motherPhone: '', address: 'النجف - الجمعية', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 16, firstName: 'بنين', fatherName: 'سعد', grandfatherName: 'جميل', fourthName: '', surname: 'الساعدي', fullName: 'بنين سعد جميل الساعدي', gender: 'طالبة', grade: 'الرابع الابتدائي', fatherPhone: '07756789012', motherPhone: '07856789012', address: 'النجف - المعلمين', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 17, firstName: 'آية', fatherName: 'طالب', grandfatherName: 'مجيد', fourthName: '', surname: 'البدرين', fullName: 'آية طالب مجيد البدرين', gender: 'طالبة', grade: 'الثاني الابتدائي', fatherPhone: '07967890123', motherPhone: '', address: 'النجف - النصر', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 18, firstName: 'نور', fatherName: 'فؤاد', grandfatherName: 'نجم', fourthName: '', surname: 'الجبوري', fullName: 'نور فؤاد نجم الجبوري', gender: 'طالبة', grade: 'الخامس الابتدائي', fatherPhone: '07778901234', motherPhone: '07878901234', address: 'النجف - الجامعة', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 19, firstName: 'غفران', fatherName: 'ثامر', grandfatherName: 'رزاق', fourthName: '', surname: 'البصري', fullName: 'غفران ثامر رزاق البصري', gender: 'طالبة', grade: 'السادس الابتدائي', fatherPhone: '07889012345', motherPhone: '', address: 'النجف - الغدير', photoUrl: defaultAvatar, documentUrl: '', notes: '' },
    { id: 20, firstName: 'سارة', fatherName: 'نبيل', grandfatherName: 'جواد', fourthName: '', surname: 'العبادي', fullName: 'سارة نبيل جواد العبادي', gender: 'طالبة', grade: 'الأول الابتدائي', fatherPhone: '07990123456', motherPhone: '07790123456', address: 'النجف - حي الهرمات', photoUrl: defaultAvatar, documentUrl: '', notes: '' }
  ];
  const [students, setStudents] = useState(initialStudents);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [grandfatherName, setGrandfatherName] = useState('');
  const [fourthName, setFourthName] = useState('');
  const [surname, setSurname] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newGrade, setNewGrade] = useState('الأول الابتدائي');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [address, setAddress] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [filterGrade, setFilterGrade] = useState('الكل');
  const [filterGender, setFilterGender] = useState('الكل');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState(null);

  const resetAddForm = () => {
    setFirstName(''); setFatherName(''); setGrandfatherName(''); setFourthName(''); setSurname('');
    setNewGender(''); setNewGrade('الأول الابتدائي'); setFatherPhone(''); setMotherPhone(''); setAddress(''); setDocumentUrl('');
  };
  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (file) setDocumentUrl(URL.createObjectURL(file));
  };
  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !fatherName.trim() || !grandfatherName.trim() || !newGender) return;
    const fullNameParts = [firstName, fatherName, grandfatherName, fourthName, surname].filter(Boolean);
    const newStudent = {
      id: students.length + 1, firstName, fatherName, grandfatherName, fourthName, surname,
      fullName: fullNameParts.join(' '), gender: newGender, grade: newGrade, fatherPhone, motherPhone, address,
      photoUrl: defaultAvatar, documentUrl: documentUrl, notes: ''
    };
    setStudents([...students, newStudent]);
    resetAddForm();
    setIsAddModalOpen(false);
  };
  const filteredStudents = students.filter((student) => {
    const matchesGrade = filterGrade === 'الكل' || student.grade === filterGrade;
    const matchesGender = filterGender === 'الكل' || student.gender === filterGender;
    return matchesGrade && matchesGender;
  });
  const openStudentDetails = (student) => {
    setSelectedStudent(student);
    setEditedStudent({ ...student });
    setIsEditing(false);
  };
  const closeDetails = () => { setSelectedStudent(null); setEditedStudent(null); };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setEditedStudent({ ...editedStudent, photoUrl: URL.createObjectURL(file) });
  };
  const handleSaveChanges = () => {
    const fullNameParts = [editedStudent.firstName, editedStudent.fatherName, editedStudent.grandfatherName, editedStudent.fourthName, editedStudent.surname].filter(Boolean);
    const updatedStudentData = { ...editedStudent, fullName: fullNameParts.join(' ') };
    setStudents(students.map(s => s.id === updatedStudentData.id ? updatedStudentData : s));
    setSelectedStudent(updatedStudentData);
    setIsEditing(false);
  };

  return (
    <div className="main-content" style={{ direction: 'rtl', textAlign: 'right' }}>
      <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'right' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3c72', margin: 0 }}>قائمة الطلاب</h2>
        <div className="user-profile">أهلاً بك، المدير 👤</div>
      </header>
      <section className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'right' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px' }}>سجل الطلاب والطالبات</h3>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>يمكنك إضافة طالب جديد أو تصفية القائمة والاطلاع على التفاصيل.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#1e3c72', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>إضافة طالب / طالبة جديد +</button>
      </section>
      <section className="card" style={{ marginBottom: '20px', backgroundColor: '#eef2f7', textAlign: 'right' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e3c72' }}>🔍 تصفية الطلاب حسب المرحلة والنوع:</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#444' }}>المرحلة الدراسية:</label>
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', backgroundColor: 'white' }}>
              <option value="الكل">جميع المراحل (الكل)</option>
              <option value="الأول الابتدائي">الأول الابتدائي</option>
              <option value="الثاني الابتدائي">الثاني الابتدائي</option>
              <option value="الثالث الابتدائي">الثالث الابتدائي</option>
              <option value="الرابع الابتدائي">الرابع الابتدائي</option>
              <option value="الخامس الابتدائي">الخامس الابتدائي</option>
              <option value="السادس الابتدائي">السادس الابتدائي</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#444' }}>النوع:</label>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', backgroundColor: 'white' }}>
              <option value="الكل">الكل (طلاب وطالبات)</option>
              <option value="طالب">الطلاب فقط 💙</option>
              <option value="طالبة">الطالبات فقط 🌸</option>
            </select>
          </div>
        </div>
      </section>
      <section className="card" style={{ textAlign: 'right' }}>
        <h3 style={{ fontSize: '15px', color: '#333', marginBottom: '10px' }}>القائمة ({filteredStudents.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', color: '#555', fontSize: '13px' }}>
              <th style={{ padding: '10px' }}>#</th>
              <th style={{ padding: '10px' }}>الاسم الكامل</th>
              <th style={{ padding: '10px' }}>النوع</th>
              <th style={{ padding: '10px' }}>المرحلة الدراسية</th>
              <th style={{ padding: '10px' }}>مكان السكن</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <td style={{ padding: '10px' }}>{student.id}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => openStudentDetails(student)} style={{ background: 'none', border: 'none', padding: 0, color: '#1e3c72', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>{student.fullName}</button>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ backgroundColor: student.gender === 'طالبة' ? '#fce4ec' : '#e3f2fd', color: student.gender === 'طالبة' ? '#c2185b' : '#1565c0', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {student.gender === 'طالبة' ? 'طالبة 🌸' : 'طالب 💙'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>{student.grade}</td>
                  <td style={{ padding: '10px' }}>{student.address || 'غير محدد'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>لا توجد بيانات مطابقة.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* نافذة الإضافة */}
      {isAddModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button onClick={() => setIsAddModalOpen(false)} style={closeButtonStyle}>&times;</button>
            <h2 style={{ color: '#1e3c72', fontSize: '18px', marginTop: 0, marginBottom: '15px', textAlign: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>إضافة طالب / طالبة جديد</h2>
            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right' }}>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>الاسم الأول *</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={modalInputStyle} required /></div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>اسم الأب *</label><input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} style={modalInputStyle} required /></div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>اسم الجد *</label><input type="text" value={grandfatherName} onChange={(e) => setGrandfatherName(e.target.value)} style={modalInputStyle} required /></div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>الاسم الرابع</label><input type="text" value={fourthName} onChange={(e) => setFourthName(e.target.value)} style={modalInputStyle} /></div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>اللقب</label><input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} style={modalInputStyle} /></div>
              <div style={inputGroupStyle}>
                <label style={modalLabelStyle}>النوع *</label>
                <select value={newGender} onChange={(e) => setNewGender(e.target.value)} style={modalInputStyle} required>
                  <option value="" disabled>اختر النوع</option>
                  <option value="طالب">طالب (ولد)</option>
                  <option value="طالبة">طالبة (بنت)</option>
                </select>
              </div>
              <div style={inputGroupStyle}>
                <label style={modalLabelStyle}>المرحلة الدراسية *</label>
                <select value={newGrade} onChange={(e) => setNewGrade(e.target.value)} style={modalInputStyle} required>
                  <option value="الأول الابتدائي">الأول الابتدائي</option>
                  <option value="الثاني الابتدائي">الثاني الابتدائي</option>
                  <option value="الثالث الابتدائي">الثالث الابتدائي</option>
                  <option value="الرابع الابتدائي">الرابع الابتدائي</option>
                  <option value="الخامس الابتدائي">الخامس الابتدائي</option>
                  <option value="السادس الابتدائي">السادس الابتدائي</option>
                </select>
              </div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>رقم هاتف الأب</label><input type="text" value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} style={modalInputStyle} /></div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>رقم هاتف الأم</label><input type="text" value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} style={modalInputStyle} /></div>
              <div style={inputGroupStyle}><label style={modalLabelStyle}>مكان السكن</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={modalInputStyle} /></div>
              <div style={inputGroupStyle}>
                <label style={modalLabelStyle}>الوثيقة الرسمية</label>
                <input type="file" accept="image/*,.pdf" onChange={handleDocumentUpload} style={{ marginTop: '5px', fontSize: '13px' }} />
                {documentUrl && <span style={{ color: '#137333', fontSize: '12px', fontWeight: 'bold', marginTop: '3px' }}>✓ تم رفع الوثيقة بنجاح</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                <button type="submit" style={primaryButtonStyle}>حفظ وإضافة</button>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={secondaryButtonStyle}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة التفاصيل والتعديل */}
      {selectedStudent && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button onClick={closeDetails} style={closeButtonStyle}>&times;</button>
            <header style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px', textAlign: 'center' }}>
              <h2 style={{ color: '#1e3c72', fontSize: '18px', margin: 0 }}>تفاصيل الطالب الكاملة</h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '15px' }}>
              <img src={editedStudent.photoUrl || defaultAvatar} alt="الصورة" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #1e3c72', marginBottom: '8px' }} />
              {isEditing && (
                <label style={{ backgroundColor: '#eef2f7', color: '#1e3c72', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', border: '1px solid #1e3c72' }}>
                  تغيير الصورة الشخصية 📷
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
              {isEditing ? (
                <>
                  <div style={rowStyle}><label style={labelStyle}>الاسم الأول *:</label><input type="text" value={editedStudent.firstName} onChange={(e) => setEditedStudent({...editedStudent, firstName: e.target.value})} style={inputStyle} /></div>
                  <div style={rowStyle}><label style={labelStyle}>اسم الأب *:</label><input type="text" value={editedStudent.fatherName} onChange={(e) => setEditedStudent({...editedStudent, fatherName: e.target.value})} style={inputStyle} /></div>
                  <div style={rowStyle}><label style={labelStyle}>اسم الجد *:</label><input type="text" value={editedStudent.grandfatherName} onChange={(e) => setEditedStudent({...editedStudent, grandfatherName: e.target.value})} style={inputStyle} /></div>
                  <div style={rowStyle}><label style={labelStyle}>الاسم الرابع:</label><input type="text" value={editedStudent.fourthName} onChange={(e) => setEditedStudent({...editedStudent, fourthName: e.target.value})} style={inputStyle} /></div>
                  <div style={rowStyle}><label style={labelStyle}>اللقب:</label><input type="text" value={editedStudent.surname} onChange={(e) => setEditedStudent({...editedStudent, surname: e.target.value})} style={inputStyle} /></div>
                </>
              ) : (
                <div style={rowStyle}><label style={labelStyle}>الاسم الكامل:</label><p style={valueStyle}>{selectedStudent.fullName}</p></div>
              )}
              <div style={rowStyle}>
                <label style={labelStyle}>النوع:</label>
                {isEditing ? (
                  <select value={editedStudent.gender} onChange={(e) => setEditedStudent({...editedStudent, gender: e.target.value})} style={inputStyle}>
                    <option value="طالب">طالب (ولد)</option>
                    <option value="طالبة">طالبة (بنت)</option>
                  </select>
                ) : (
                  <span style={{ backgroundColor: selectedStudent.gender === 'طالبة' ? '#fce4ec' : '#e3f2fd', color: selectedStudent.gender === 'طالبة' ? '#c2185b' : '#1565c0', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', width: 'fit-content', fontWeight: 'bold' }}>
                    {selectedStudent.gender === 'طالبة' ? 'طالبة 🌸' : 'طالب 💙'}
                  </span>
                )}
              </div>
              <div style={rowStyle}>
                <label style={labelStyle}>المرحلة الدراسية:</label>
                {isEditing ? (
                  <select value={editedStudent.grade} onChange={(e) => setEditedStudent({...editedStudent, grade: e.target.value})} style={inputStyle}>
                    <option value="الأول الابتدائي">الأول الابتدائي</option>
                    <option value="الثاني الابتدائي">الثاني الابتدائي</option>
                    <option value="الثالث الابتدائي">الثالث الابتدائي</option>
                    <option value="الرابع الابتدائي">الرابع الابتدائي</option>
                    <option value="الخامس الابتدائي">الخامس الابتدائي</option>
                    <option value="السادس الابتدائي">السادس الابتدائي</option>
                  </select>
                ) : <p style={valueStyle}>{selectedStudent.grade}</p>}
              </div>
              <div style={rowStyle}><label style={labelStyle}>رقم هاتف الأب:</label>{isEditing ? <input type="text" value={editedStudent.fatherPhone} onChange={(e) => setEditedStudent({...editedStudent, fatherPhone: e.target.value})} style={inputStyle} /> : <p style={valueStyle}>{selectedStudent.fatherPhone || 'غير مسجل'}</p>}</div>
              <div style={rowStyle}><label style={labelStyle}>رقم هاتف الأم:</label>{isEditing ? <input type="text" value={editedStudent.motherPhone} onChange={(e) => setEditedStudent({...editedStudent, motherPhone: e.target.value})} style={inputStyle} /> : <p style={valueStyle}>{selectedStudent.motherPhone || 'غير مسجل'}</p>}</div>
              <div style={rowStyle}><label style={labelStyle}>مكان السكن:</label>{isEditing ? <input type="text" value={editedStudent.address} onChange={(e) => setEditedStudent({...editedStudent, address: e.target.value})} style={inputStyle} /> : <p style={valueStyle}>{selectedStudent.address || 'غير مسجل'}</p>}</div>
            </div>
            <footer style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {isEditing ? (
                <>
                  <button onClick={handleSaveChanges} style={primaryButtonStyle}>حفظ التعديلات</button>
                  <button onClick={() => setIsEditing(false)} style={secondaryButtonStyle}>إلغاء</button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} style={primaryButtonStyle}>تعديل البيانات ✏️</button>
                  <button onClick={closeDetails} style={secondaryButtonStyle}>إغلاق</button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px', direction: 'rtl' };
const modalContentStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', textAlign: 'right' };
const closeButtonStyle = { position: 'absolute', top: '12px', left: '12px', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#999' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '3px' };
const modalLabelStyle = { fontWeight: 'bold', fontSize: '12px', color: '#444' };
const modalInputStyle = { padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', width: '100%', boxSizing: 'border-box', textAlign: 'right' };
const rowStyle = { display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#f8f9fa', padding: '6px 10px', borderRadius: '6px', borderRight: '4px solid #1e3c72' };
const labelStyle = { fontWeight: 'bold', color: '#555', fontSize: '11px' };
const valueStyle = { margin: 0, fontSize: '13px', color: '#222', fontWeight: '500' };
const inputStyle = { width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', boxSizing: 'border-box', textAlign: 'right' };
const primaryButtonStyle = { backgroundColor: '#1e3c72', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };
const secondaryButtonStyle = { backgroundColor: '#e0e0e0', color: '#333', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };