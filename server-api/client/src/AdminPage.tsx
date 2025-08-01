import React, { useState, useEffect } from 'react';

interface UserStats {
  currentUsers: number;
  totalVisits: number;
  lastVisit: string | null;
}

interface AppSettings {
  title: string;
}

const AdminPage: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats>({
    currentUsers: 0,
    totalVisits: 0,
    lastVisit: null
  });
  const [settings, setSettings] = useState<AppSettings>({
    title: '안녕하세요'
  });
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 사용자 통계 가져오기
    fetchUserStats();
    // 설정 가져오기
    fetchSettings();
    
    // 주기적으로 통계 업데이트
    const interval = setInterval(fetchUserStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-stats');
      const data = await response.json();
      if (data.success) {
        setUserStats(data.userStats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        setNewTitle(data.settings.title);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleUpdateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        alert('제목이 업데이트되었습니다!');
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to update title:', error);
      alert('제목 업데이트에 실패했습니다.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage('');
        alert('메시지가 전송되었습니다!');
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🎈 CheerCast 관리자 페이지
        </h1>

        {/* 사용자 통계 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 사용자 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{userStats.currentUsers}</div>
              <div className="text-sm text-gray-600">현재 접속자</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userStats.totalVisits}</div>
              <div className="text-sm text-gray-600">총 방문자</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">
                {userStats.lastVisit ? new Date(userStats.lastVisit).toLocaleString('ko-KR') : '없음'}
              </div>
              <div className="text-sm text-gray-600">마지막 방문</div>
            </div>
          </div>
        </div>

        {/* 설정 관리 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">⚙️ 설정 관리</h2>
          <form onSubmit={handleUpdateTitle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                페이지 제목
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="페이지 제목을 입력하세요"
                maxLength={50}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              제목 업데이트
            </button>
          </form>
          <div className="mt-4 text-sm text-gray-600">
            현재 제목: <span className="font-medium">{settings.title}</span>
          </div>
        </div>

        {/* 메시지 전송 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">💬 메시지 전송</h2>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용자에게 메시지 전송
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="메시지를 입력하세요 (120자 이하)"
                maxLength={120}
                rows={3}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {message.length}/120
              </div>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
              disabled={!message.trim()}
            >
              메시지 전송
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;