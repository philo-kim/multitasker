import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Clock, CheckCircle, Circle, Sparkles, ChevronDown, ChevronRight, Play, Check } from 'lucide-react';

export default function Multitasker() {
  const [todos, setTodos] = useState([]);
  const [doingTasks, setDoingTasks] = useState([]);
  const [doneTasks, setDoneTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isBreakingDown, setIsBreakingDown] = useState([]);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [expandedDone, setExpandedDone] = useState({});

  // 실제 Claude API를 사용한 태스크 분할 함수
  const breakDownTask = async (task) => {
    // 이미 처리 중인 태스크라면 무시
    if (isBreakingDown.includes(task.id)) return;
    
    // 처리 중인 태스크 목록에 추가
    setIsBreakingDown(prev => [...prev, task.id]);
    
    try {
      const response = await fetch('/api/break-down-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: task.title }),
      });

      const data = await response.json();

      // 유효하지 않은 작업인 경우
      if (!response.ok || data.error) {
        alert(`❌ ${data.message}\n\n💡 ${data.suggestion || '다시 시도해주세요.'}`);
        // 처리 중 상태 해제
        setIsBreakingDown(prev => prev.filter(id => id !== task.id));
        return;
      }
      
      const subtasks = data.subtasks.map((subtask, index) => ({
        id: Date.now() + index,
        title: subtask.title,
        description: subtask.description || '',
        estimatedTime: subtask.estimatedTime,
        completed: false
      }));

      setTodos(prev => prev.filter(t => t.id !== task.id));
      setDoingTasks(prev => [...prev, {
        ...task,
        subtasks,
        startedAt: new Date().toLocaleString()
      }]);

    } catch (error) {
      console.error('분할 실패:', error);
      
      // 에러 시 시뮬레이션 분할 제공
      const simulatedBreakdowns = {
        '방 청소하기': [
          { title: '청소 용품 준비하기', description: '청소기, 걸레, 세제 등 필요한 도구 모으기', estimatedTime: '5분' },
          { title: '바닥 정리하기', description: '바닥에 있는 물건들 제자리에 정리', estimatedTime: '15분' },
          { title: '침대 정리하기', description: '이불 개고 베개 정리하기', estimatedTime: '5분' },
          { title: '책상 정리하기', description: '책상 위 물건 정리하고 먼지 닦기', estimatedTime: '10분' },
          { title: '바닥 청소하기', description: '청소기로 바닥 청소하기', estimatedTime: '10분' }
        ],
        '보고서 작성하기': [
          { title: '자료 수집하기', description: '필요한 데이터와 참고 자료 모으기', estimatedTime: '20분' },
          { title: '개요 작성하기', description: '보고서 구조와 목차 정리', estimatedTime: '15분' },
          { title: '서론 작성하기', description: '배경과 목적 설명하기', estimatedTime: '20분' },
          { title: '본론 작성하기', description: '핵심 내용과 분석 결과 작성', estimatedTime: '30분' },
          { title: '결론 작성하기', description: '요약과 제언 작성', estimatedTime: '15분' },
          { title: '검토 및 수정하기', description: '오타 확인하고 내용 다듬기', estimatedTime: '10분' }
        ],
        '운동하기': [
          { title: '운동복 갈아입기', description: '편한 운동복으로 갈아입기', estimatedTime: '3분' },
          { title: '워밍업하기', description: '5분간 가벼운 스트레칭', estimatedTime: '5분' },
          { title: '유산소 운동하기', description: '달리기 또는 빠른 걷기', estimatedTime: '20분' },
          { title: '근력 운동하기', description: '팔굽혀펴기, 스쿼트 등', estimatedTime: '15분' },
          { title: '마무리 스트레칭', description: '근육 이완을 위한 스트레칭', estimatedTime: '5분' }
        ]
      };

      const fallbackSubtasks = simulatedBreakdowns[task.title] || [
        { title: `${task.title} - 1단계`, description: "첫 번째 작업 단계", estimatedTime: "15분" },
        { title: `${task.title} - 2단계`, description: "두 번째 작업 단계", estimatedTime: "20분" },
        { title: `${task.title} - 3단계`, description: "마지막 작업 단계", estimatedTime: "10분" }
      ];

      const subtasks = fallbackSubtasks.map((subtask, index) => ({
        id: Date.now() + index,
        title: subtask.title,
        description: subtask.description,
        estimatedTime: subtask.estimatedTime,
        completed: false
      }));

      setTodos(prev => prev.filter(t => t.id !== task.id));
      setDoingTasks(prev => [...prev, {
        ...task,
        subtasks,
        startedAt: new Date().toLocaleString()
      }]);
    }
    
    // 처리 완료 후 목록에서 제거
    setIsBreakingDown(prev => prev.filter(id => id !== task.id));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task = {
      id: Date.now(),
      title: newTask,
      createdAt: new Date().toLocaleString()
    };
    setTodos(prev => [...prev, task]);
    setNewTask('');
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setDoingTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === subtaskId 
            ? { ...subtask, completed: !subtask.completed }
            : subtask
        );
        
        const allCompleted = updatedSubtasks.every(subtask => subtask.completed);
        
        if (allCompleted) {
          const completedTask = {
            ...task,
            subtasks: updatedSubtasks,
            completedAt: new Date().toLocaleString()
          };
          setDoneTasks(prev => [...prev, completedTask]);
          return null;
        }
        
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    }).filter(Boolean));
  };

  const toggleDoneExpansion = (taskId) => {
    setExpandedDone(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // 대주제(전체 태스크) 삭제
  const deleteMainTask = (taskId) => {
    if (confirm('이 작업을 완전히 삭제하시겠습니까?')) {
      setDoingTasks(prev => prev.filter(task => task.id !== taskId));
    }
  };

  // 소주제(서브태스크) 삭제
  const deleteSubtask = (taskId, subtaskId) => {
    setDoingTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
        
        // 서브태스크가 모두 삭제되면 메인 태스크도 삭제
        if (updatedSubtasks.length === 0) {
          return null;
        }
        
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    }).filter(Boolean));
  };

  // 소주제 수정 시작
  const startEditSubtask = (taskId, subtask) => {
    setEditingSubtask({
      taskId,
      subtaskId: subtask.id,
      title: subtask.title,
      description: subtask.description || '',
      estimatedTime: subtask.estimatedTime || ''
    });
  };

  // 소주제 수정 저장
  const saveSubtaskEdit = () => {
    if (!editingSubtask.title.trim()) return;

    setDoingTasks(prev => prev.map(task => {
      if (task.id === editingSubtask.taskId) {
        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === editingSubtask.subtaskId
            ? {
                ...subtask,
                title: editingSubtask.title,
                description: editingSubtask.description,
                estimatedTime: editingSubtask.estimatedTime
              }
            : subtask
        );
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    }));

    setEditingSubtask(null);
  };

  // 소주제 수정 취소
  const cancelSubtaskEdit = () => {
    setEditingSubtask(null);
  };

  const TodoItem = ({ task }) => (
    <div className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-800 mb-1">{task.title}</h4>
          <p className="text-xs text-gray-500">{task.createdAt}</p>
        </div>
        <button
          onClick={() => breakDownTask(task)}
          disabled={isBreakingDown.includes(task.id)}
          className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {isBreakingDown.includes(task.id) ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              분할 중...
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              시작
            </>
          )}
        </button>
      </div>
    </div>
  );

  const DoingColumn = ({ task }) => (
    <div className="flex-shrink-0 w-80 bg-yellow-50 rounded-lg p-4 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 truncate flex-1 mr-2">{task.title}</h3>
        <div className="flex items-center gap-2">
          <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs">
            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
          </span>
          <button
            onClick={() => deleteMainTask(task.id)}
            className="text-red-500 hover:text-red-700 p-1"
            title="전체 작업 삭제"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {task.subtasks.map(subtask => (
          <div key={subtask.id} className="bg-white rounded p-3 border border-gray-200 group">
            {editingSubtask && editingSubtask.subtaskId === subtask.id ? (
              // 편집 모드
              <div className="space-y-2">
                <input
                  value={editingSubtask.title}
                  onChange={(e) => setEditingSubtask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-sm font-medium border rounded px-2 py-1"
                  placeholder="작업 제목"
                />
                <input
                  value={editingSubtask.description}
                  onChange={(e) => setEditingSubtask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs border rounded px-2 py-1"
                  placeholder="작업 설명"
                />
                <input
                  value={editingSubtask.estimatedTime}
                  onChange={(e) => setEditingSubtask(prev => ({ ...prev, estimatedTime: e.target.value }))}
                  className="w-full text-xs border rounded px-2 py-1"
                  placeholder="예상 시간"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSubtaskEdit}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelSubtaskEdit}
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              // 일반 모드
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleSubtask(task.id, subtask.id)}
                  className={`mt-0.5 ${subtask.completed ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {subtask.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <h5 className={`text-sm font-medium ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {subtask.title}
                  </h5>
                  {subtask.description && (
                    <p className="text-xs text-gray-600 mt-1">{subtask.description}</p>
                  )}
                  {subtask.estimatedTime && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{subtask.estimatedTime}</span>
                    </div>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => startEditSubtask(task.id, subtask)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="수정"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteSubtask(task.id, subtask.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="삭제"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const DoneItem = ({ task }) => (
    <div className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => toggleDoneExpansion(task.id)}
      >
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <div>
            <h4 className="font-medium text-gray-800">{task.title}</h4>
            <p className="text-xs text-gray-500">완료: {task.completedAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
            {task.subtasks.length}개 완료
          </span>
          {expandedDone[task.id] ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {expandedDone[task.id] && (
        <div className="mt-3 pl-7 space-y-2">
          {task.subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">{subtask.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎯 Multitasker
          </h1>
          <p className="text-gray-600">
            ADHD 친화적 멀티태스킹 - 큰 일을 작은 단위로 나누어 차근차근 진행해보세요
          </p>
        </div>

        <div className="flex gap-6">
          {/* To do 섹션 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">📝 To do</h3>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-sm">
                  {todos.length}
                </span>
              </div>

              {/* 새 할일 추가 */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                    placeholder="새 할일 입력..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTask.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 할일 목록 */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {todos.map(task => (
                  <TodoItem key={task.id} task={task} />
                ))}
                {todos.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <Circle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">할일을 추가해보세요</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Doing 섹션 */}
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                🚀 Doing
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-sm">
                  {doingTasks.length}
                </span>
              </h3>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4">
              {doingTasks.map(task => (
                <DoingColumn key={task.id} task={task} />
              ))}
              {doingTasks.length === 0 && (
                <div className="flex-1 bg-yellow-50 rounded-lg p-8 text-center">
                  <div className="text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">To do에서 할일을 시작해보세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Done 섹션 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">✅ Done</h3>
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-sm">
                  {doneTasks.length}
                </span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {doneTasks.map(task => (
                  <DoneItem key={task.id} task={task} />
                ))}
                {doneTasks.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">완료된 일이 여기 표시됩니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 도움말 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 사용 팁</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• To do에 큰 할일을 입력하고 '시작' 버튼을 클릭하세요</li>
            <li>• AI가 자동으로 작은 단위로 나누어 Doing 영역에 표시합니다</li>
            <li>• 체크박스를 클릭해서 작은 일들을 하나씩 완료해보세요</li>
            <li>• 모든 서브태스크가 완료되면 자동으로 Done으로 이동합니다</li>
            <li>• Done에서 완료된 작업을 클릭하면 세부사항을 볼 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}