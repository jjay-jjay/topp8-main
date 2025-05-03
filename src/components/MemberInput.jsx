import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  collection,
  addDoc,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import './MemberInput.css';

function MemberInput() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topicInfo, setTopicInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [singleMember, setSingleMember] = useState('');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ visible: false, step: 'confirm' });
  const [groups, setGroups] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [formMode, setFormMode] = useState('new'); // 'new' or 'join'
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // Fetch topic info
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const topicRef = doc(db, 'topics', topicId);
        const snap = await getDoc(topicRef);
        
        if (!snap.exists()) {
          setError('ບໍ່ເຫັນຫົວຂໍ້ນີ້');
          setLoading(false);
          return;
        }
        
        const data = snap.data();
        if (!data.membersPerGroup) {
          setError('ຫົວຂໍ້ນີ້ບໍ່ພ້ອມຮັບການສະໝັກ');
          setLoading(false);
          return;
        }
        
        setTopicInfo(data);
        setMembers(Array(data.membersPerGroup).fill(''));
        
        // Subscribe to groups for this topic
        const grpQuery = query(
          collection(db, 'groups'),
          where('topicId', '==', topicRef)
        );
        
        const unsubscribe = onSnapshot(grpQuery, snapGroups => {
          setGroups(snapGroups.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [topicId]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
  
    try {
      if (!topicInfo) throw new Error('ຍັງບໍ່ໄດ້ໂຫຼດຂໍ້ມູລຫົວຂໍ້');
      if (topicInfo.status !== 'active') throw new Error('ຫົວຂໍ້ນີ້ປິດຮັຍສະໝັກແລ້ວ');
      
      const filled = members.map(m => m.trim()).filter(m => m);
      if (filled.length !== topicInfo.membersPerGroup) 
        throw new Error(`ກະລຸນາກອກຊື່ສະມາຊິກ ${topicInfo.membersPerGroup} ຄົນ`);
      
      const existsSnap = await getDocs(
        query(
          collection(db, 'groups'),
          where('topicId', '==', doc(db, 'topics', topicId)) // ແກ້ໄຂວົງປິດທີ່ນີ້
        )
      );
      
      if (existsSnap.size >= topicInfo.maxGroups) throw new Error('ຫົວຂໍ້ນີ້ເຕັ້ມແລ້ວ');
      setModal({ visible: true, step: 'confirm', data: filled });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleJoinGroup = async e => {
    e.preventDefault();
    if (isSubmitting) return; // ກວດສອບສະຖານະ
    setError('');
    setIsSubmitting(true);

    try {
      if (!singleMember.trim()) throw new Error('ກະລຸນາກອກຊື່ສະມາຊິກ');
      if (!currentGroup) throw new Error('ບໍ່ເຫັນຂໍ້ມູນກຸ່ມ');
      
      const groupRef = doc(db, 'groups', currentGroup.id);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) throw new Error('ບໍ່ເຫັນຂໍ້ມູນກຸ່ມ');
      
      const groupData = groupSnap.data();
      
      if (groupData.members.length >= topicInfo.membersPerGroup)
        throw new Error('ກຸ່ມນີ້ເຕັມແລ້ວ');
      
      setModal({ 
        visible: true, 
        step: 'confirm', 
        data: [singleMember.trim()],
        mode: 'join',
        groupId: currentGroup.id
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSubmit = async () => {
    if (isSubmitting) return; // ກວດສອບສະຖານະ
    try {
      setIsSubmitting(true);
      if (modal.mode === 'join') {
        const groupRef = doc(db, 'groups', modal.groupId);
        await updateDoc(groupRef, {
          members: arrayUnion(modal.data[0])
        });
      } else {
        await addDoc(collection(db, 'groups'), {
          topicId: doc(db, 'topics', topicId),
          members: modal.data,
          status: 'approved',
          createdAt: serverTimestamp()
        });
      }
      setModal({ visible: true, step: 'success' });
    } catch (err) {
      setError(err.message);
      setModal({ visible: false, step: 'confirm' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setModal({ visible: false, step: 'confirm' });
    if (topicInfo) {
      setMembers(Array(topicInfo.membersPerGroup).fill(''));
    }
    setSingleMember('');
    setFormMode('new');
    setCurrentGroup(null);
  };

  const showJoinForm = (group) => {
    setFormMode('join');
    setCurrentGroup(group);
    setExpandedGroup(null);
    setSingleMember('');
    setError('');
  };

  const cancelJoin = () => {
    setFormMode('new');
    setCurrentGroup(null);
    setSingleMember('');
    setError('');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>ກຳລັງໂຫຼດຂໍ້ມູນ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="topic-header-area">
      <Link to="//" className="back-button">
  &larr; ກັບໜ້າຫຼັກ
</Link>

        <h1 className="topic-title">{topicInfo?.name || 'ບໍ່ເຫັນຫົວຂໍ້'}</h1>
        {topicInfo && (
          <div className="topic-meta-info">
            <span className="topic-stat-item">
              <strong>ສະມາຊິກຕໍ່ກຸ່ມ:</strong> {topicInfo.membersPerGroup} ຄົນ
            </span>
            <span className="topic-stat-item">
              <strong>ສະໝັກແລ້ວ:</strong> {groups.length}/{topicInfo.maxGroups} ກຸ່ມ
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
        </div>
      )}

      {/* Group list */}
      <div className="group-section">
        <div className="section-header">
          <h2>ກູ່ມທີ່ສະໝັກແລ້ວ</h2>
          {topicInfo && groups.length >= topicInfo.maxGroups && (
            <span className="topic-full-label">ເຕັມແລ້ວ</span>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="empty-groups">
            <p>ຍັງບໍ່ມີການສະໝັກກຸ່ມ</p>
          </div>
        ) : (
          <div className="group-list">
            {groups.map((group, idx) => {
              const isFull = group.members.length >= topicInfo.membersPerGroup;
              const isExpanded = expandedGroup === group.id;
              
              return (
                <div 
                  key={group.id} 
                  className={`group-card ${isExpanded ? 'expanded' : ''} ${isFull ? 'full' : ''}`}
                >
                  <div 
                    className="group-header"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  >
                    <div className="group-name">ກຸ່ມ {idx + 1}</div>
                    <div className="group-capacity">
                      <span className="member-count">{group.members.length}/{topicInfo.membersPerGroup}</span>
                      <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="group-details">
                      <h3>ລາຍຊື່ສະມາຊິກ</h3>
                      <ul className="member-list">
                        {group.members.map((member, i) => (
                          <li key={i} className="member-item">{member}</li>
                        ))}
                        
                        {!isFull && Array(topicInfo.membersPerGroup - group.members.length).fill().map((_,i) => (
                          <li key={`empty-${i}`} className="member-item empty">
                            <span className="empty-slot">ว่าง</span>
                          </li>
                        ))}
                      </ul>
                      
                      {!isFull && topicInfo.status === 'active' && (
                        <button 
                          className="join-group-button"
                          onClick={() => showJoinForm(group)}
                        >
                          ເຂົ້າຮ່ວມກຸ່ມນີ້
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form section */}
      {topicInfo && topicInfo.status === 'active' && (
        <div className="form-section">
          {formMode === 'new' ? (
            <>
              {groups.length < topicInfo.maxGroups && (
                <>
                  <div className="section-header">
                    <h2>ສ້າງກຸ່ມໃໝ່</h2>
                  </div>
                  <form onSubmit={handleSubmit} className="group-form">
                    <div className="form-description">
                      <p>ກະລຸນາກອກຊື່ສະມາຊິກທັງໝົດ {topicInfo.membersPerGroup} ຄົນ</p>
                    </div>
                    
                    <div className="member-inputs">
                      {members.map((member, i) => (
                        <input
                          key={i}
                          type="text"
                          className="member-input"
                          placeholder={`ຊື່ ແລະ ນາມສະກຸນ ສະມາຊິກຄົນທີ ${i + 1}`}
                          value={members[i]}
                          onChange={e => {
                            const newMembers = [...members]; 
                            newMembers[i] = e.target.value; 
                            setMembers(newMembers);
                          }}
                          required
                        />
                      ))}
                    </div>
                    
                    <button type="submit" className="submit-button">
                      ສ້າງກຸ່ມໃໝ່
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <div className="section-header">
                <h2>ເຂົ້າຮ່ວມກຸ່ມທີ່ມີຢູ່ແລ້ວ</h2>
              </div>
              <form onSubmit={handleJoinGroup} className="join-form">
                <div className="form-description">
                  <p>ກຳລັງເຂົ້າຮ່ວມກຸ່ມ {groups.findIndex(g => g.id === currentGroup?.id) + 1}</p>
                </div>
                
                <input
                  type="text"
                  className="member-input"
                  placeholder="ໍຊື່"
                  value={singleMember}
                  onChange={e => setSingleMember(e.target.value)}
                  required
                />
                
                <div className="form-buttons">
                  <button type="submit" className="submit-button">
                    ເຂົ້າຮ່ວມກຸ່ມ
                  </button>
                  <button type="button" className="cancel-button" onClick={cancelJoin}>
                    ຍົກເລີກ
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Modal confirmation */}
      {modal.visible && (
        <div className="modal-overlay">
          <div className="modal-container">
            {modal.step === 'confirm' ? (
              <>
                <h3 className="modal-title">ຢືນຢັນການສະໝັກ</h3>
                <div className="modal-content">
                  {modal.mode === 'join' ? (
                    <p>ຕ້ອງການເຂົ້າກຸ່ມດ້ວຍຊື່ "{modal.data[0]}" ແມ່ນຫຼືບໍ່</p>
                  ) : (
                    <>
                      <p>ຢືນຢັນການສ້າງກຸ່ມໃໝ່ດ້ວຍລາຍຊື່ຕໍ່ໄປນີ້:</p>
                      <ul className="confirm-list">
                        {modal.data.map((member, i) => (
                          <li key={i}>{member}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="modal-buttons">
        <button 
          onClick={confirmSubmit} 
          className="confirm-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'ກຳລັງດຳເນີນການ...' : 'ຍືນຍັນ'}
        </button>
        <button onClick={closeModal} className="cancel-button">
          ຍົກເລີກ
        </button>
                </div>
              </>
            ) : (
              <>
                <div className="success-icon">✓</div>
                <h3 className="modal-title success">ສະຫມັກສຳເລັດ!</h3>
                <div className="modal-content">
                  <p>ການສະໝັກແລ້ວສົມບູນແລ້ວ</p>
                </div>
                <div className="modal-buttons">
                  <button onClick={closeModal} className="confirm-button">
                    ຕົກລົງ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberInput;