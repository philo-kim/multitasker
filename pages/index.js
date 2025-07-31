import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Clock, CheckCircle, Circle, Sparkles, ChevronDown, ChevronRight, Play, Check, X, Edit2, Trash2 } from 'lucide-react';

export default function Multitasker() {
  const [todos, setTodos] = useState([]);
  const [doingTasks, setDoingTasks] = useState([]);
  const [doneTasks, setDoneTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isBreakingDown, setIsBreakingDown] = useState([]);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editingTodo, setEditingTodo] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [expandedDone, setExpandedDone] = useState({});

  // Undo 기능을 위한 상태 저장
  const saveStateForUndo = (action, data) => {
    const undoItem = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toLocaleString()
    };
    setUndoStack(prev => [undoItem, ...prev.slice(0, 99)]); // 최대 100개까지 저장
  };

  // Undo 실행
  const performUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[0];
    setUndoStack(prev => prev.slice(1));

    switch (lastAction.action) {
      case 'DELETE_MAIN_TASK':
        setDoingTasks(prev => [...prev, lastAction.data.task]);
        break;
      case 'DELETE_SUBTASK':
        setDoingTasks(prev => prev.map(task => 
          task.id === lastAction.data.taskId 
            ? { ...task, subtasks: [...task.subtasks, lastAction.data.subtask] }
            : task
        ));
        break;
      case 'DELETE_TODO':
        setTodos(prev => [...prev, lastAction.data.task]);
        break;
    }
  };

  // 키보드 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        performUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]);

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
      
      // 디버깅용 로그
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      // 유효하지 않은 작업인 경우 (상태 코드 400 또는 error 플래그)
      if (response.status === 400 || data.error) {
        console.log('Invalid task detected');
        
        // 커스텀 모달로 확인
        setConfirmModal({
          task: task,
          message: data.message || '분할할 수 없는 작업입니다',
          suggestion: data.suggestion || '더 구체적이고 실행 가능한 작업을 입력해주세요'
        });
        
        // 처리 중 상태 해제
        setIsBreakingDown(prev => prev.filter(id => id !== task.id));
        return;
      }

      // 정상적인 경우: subtasks 처리
      if (!data.subtasks || !Array.isArray(data.subtasks)) {
        throw new Error('Invalid subtasks format');
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
    const task = doingTasks.find(t => t.id === taskId);
    if (task) {
      saveStateForUndo('DELETE_MAIN_TASK', { task });
      setDoingTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // 소주제(서브태스크) 삭제
  const deleteSubtask = (taskId, subtaskId) => {
    const task = doingTasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(s => s.id === subtaskId);
    
    if (task && subtask) {
      saveStateForUndo('DELETE_SUBTASK', { taskId, subtask });
      
      setDoingTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.filter(s => s.id !== subtaskId);
          
          // 서브태스크가 모두 삭제되면 메인 태스크도 삭제
          if (updatedSubtasks.length === 0) {
            return null;
          }
          
          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      }).filter(Boolean));
    }
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

  // 커스텀 확인 모달 함수들
  const handleConfirmDelete = () => {
    if (confirmModal) {
      setTodos(prev => prev.filter(t => t.id !== confirmModal.task.id));
      setConfirmModal(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal(null);
  };

  // To do 작업 삭제
  const deleteTodoTask = (taskId) => {
    const task = todos.find(t => t.id === taskId);
    if (task) {
      saveStateForUndo('DELETE_TODO', { task });
      setTodos(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // To do 작업 수정 시작
  const startEditTodo = (task) => {
    setEditingTodo({
      id: task.id,
      title: task.title
    });
  };

  // To do 작업 수정 저장
  const saveTodoEdit = () => {
    if (!editingTodo.title.trim()) return;

    setTodos(prev => prev.map(task =>
      task.id === editingTodo.id
        ? { ...task, title: editingTodo.title }
        : task
    ));

    setEditingTodo(null);
  };

  // To do 작업 수정 취소
  const cancelTodoEdit = () => {
    setEditingTodo(null);
  };

  const TodoItem = ({ task }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group mb-3">
      {editingTodo && editingTodo.id === task.id ? (
        // 편집 모드
        <div className="p-4">
          <textarea
            value={editingTodo.title}
            onChange={(e) => setEditingTodo(prev => ({ ...prev, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveTodoEdit();
              }
              if (e.key === 'Escape') {
                cancelTodoEdit();
              }
            }}
            className="w-full text-sm resize-none border-none outline-none bg-transparent font-medium"
            placeholder="작업 제목을 입력하세요..."
            autoFocus
            rows={2}
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={saveTodoEdit}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
            <button
              onClick={cancelTodoEdit}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        // 일반 모드
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 leading-5 flex-1 pr-2">
              {task.title}
            </h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startEditTodo(task)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="수정"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteTodoTask(task.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{task.createdAt}</span>
            <button
              onClick={() => breakDownTask(task)}
              disabled={isBreakingDown.includes(task.id)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
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
      )}
    </div>
  );

  const DoingColumn = ({ task }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-80 flex-shrink-0">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm truncate flex-1 mr-2">
            {task.title}
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600 font-medium">
                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
              </span>
            </div>
            <button
              onClick={() => deleteMainTask(task.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="전체 작업 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* 진행률 바 */}
        <div className="mt-3">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ 
                width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {task.subtasks.map(subtask => (
          <div key={subtask.id} className="group">
            {editingSubtask && editingSubtask.subtaskId === subtask.id ? (
              // 편집 모드
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <input
                  value={editingSubtask.title}
                  onChange={(e) => setEditingSubtask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-sm font-medium border-none bg-transparent outline-none mb-2"
                  placeholder="작업 제목"
                />
                <textarea
                  value={editingSubtask.description}
                  onChange={(e) => setEditingSubtask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs border-none bg-transparent outline-none resize-none mb-2"
                  placeholder="작업 설명"
                  rows={2}
                />
                <input
                  value={editingSubtask.estimatedTime}
                  onChange={(e) => setEditingSubtask(prev => ({ ...prev, estimatedTime: e.target.value }))}
                  className="w-full text-xs border-none bg-transparent outline-none mb-3"
                  placeholder="예상 시간"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    disabled={!newTask.trim()}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>
              </div>

              {/* 할일 목록 */}
              <div className="flex-1 p-4 overflow-y-auto">
                {todos.map(task => (
                  <TodoItem key={task.id} task={task} />
                ))}
                {todos.length === 0 && (
                  <div className="text-center py-12">
                    <Circle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">아직 할일이 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">새로운 작업을 추가해보세요</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Doing 섹션 */}
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                Doing
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  {doingTasks.length}
                </span>
              </h3>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100%-60px)]">
              {doingTasks.map(task => (
                <DoingColumn key={task.id} task={task} />
              ))}
              {doingTasks.length === 0 && (
                <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">시작할 준비가 되었나요?</h4>
                  <p className="text-sm text-gray-500">To do에서 작업을 선택하고 '시작' 버튼을 눌러보세요</p>
                </div>
              )}
            </div>
          </div>

          {/* Done 섹션 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    Done
                  </h3>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {doneTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {doneTasks.map(task => (
                  <DoneItem key={task.id} task={task} />
                ))}
                {doneTasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">완료된 작업이 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">작업을 완료하면 여기에 표시됩니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 커스텀 확인 모달 */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
              <div className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    작업을 처리할 수 없습니다
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">"{confirmModal.task.title}"</p>
                    <p className="text-sm text-red-600 mb-2">{confirmModal.message}</p>
                    <p className="text-xs text-blue-600">💡 {confirmModal.suggestion}</p>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-700 mb-4">이 작업을 삭제하시겠습니까?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelDelete}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Undo 알림 */}
        {undoStack.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm font-medium">삭제된 항목 {undoStack.length}개</span>
              </div>
              <button
                onClick={performUndo}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-medium transition-colors"
              >
                실행 취소 (Ctrl+Z)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}={saveSubtaskEdit}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelSubtaskEdit}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              // 일반 모드
              <div className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSubtask(task.id, subtask.id)}
                    className={`mt-0.5 transition-colors ${
                      subtask.completed 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-300 hover:text-blue-600'
                    }`}
                  >
                    {subtask.completed ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-sm font-medium leading-5 ${
                      subtask.completed 
                        ? 'line-through text-gray-500' 
                        : 'text-gray-900'
                    }`}>
                      {subtask.title}
                    </h5>
                    
                    {subtask.description && (
                      <p className="text-xs text-gray-600 mt-1 leading-4">
                        {subtask.description}
                      </p>
                    )}
                    
                    {subtask.estimatedTime && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">
                          {subtask.estimatedTime}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => startEditSubtask(task.id, subtask)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteSubtask(task.id, subtask.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const DoneItem = ({ task }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-3">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => toggleDoneExpansion(task.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900 text-sm truncate">{task.title}</h4>
              <p className="text-xs text-gray-500 mt-1">완료: {task.completedAt}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              {task.subtasks.length}개 완료
            </span>
            {expandedDone[task.id] ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {expandedDone[task.id] && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="space-y-2">
            {task.subtasks.map(subtask => (
              <div key={subtask.id} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{subtask.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Multitasker
            </h1>
          </div>
          <p className="text-gray-600 text-sm">
            ADHD 친화적 멀티태스킹 도구 - AI가 큰 작업을 작은 단위로 나누어 관리를 도와드립니다
          </p>
        </div>

        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* To do 섹션 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Circle className="w-4 h-4 text-gray-400" />
                    To do
                  </h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                    {todos.length}
                  </span>
                </div>

                {/* 새 할일 추가 */}
                <div className="space-y-2">
                  <textarea
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                    placeholder="할일을 입력하세요..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTask.trim()}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>
              </div>

              {/* 할일 목록 */}
              <div className="flex-1 p-4 overflow-y-auto">
                {todos.map(task => (
                  <TodoItem key={task.id} task={task} />
                ))}
                {todos.length === 0 && (
                  <div className="text-center py-12">
                    <Circle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">아직 할일이 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">새로운 작업을 추가해보세요</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Doing 섹션 */}
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                Doing
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  {doingTasks.length}
                </span>
              </h3>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100%-60px)]">
              {doingTasks.map(task => (
                <DoingColumn key={task.id} task={task} />
              ))}
              {doingTasks.length === 0 && (
                <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">시작할 준비가 되었나요?</h4>
                  <p className="text-sm text-gray-500">To do에서 작업을 선택하고 '시작' 버튼을 눌러보세요</p>
                </div>
              )}
            </div>
          </div>

          {/* Done 섹션 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    Done
                  </h3>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {doneTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {doneTasks.map(task => (
                  <DoneItem key={task.id} task={task} />
                ))}
                {doneTasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">완료된 작업이 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">작업을 완료하면 여기에 표시됩니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 커스텀 확인 모달 */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
              <div className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    작업을 처리할 수 없습니다
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">"{confirmModal.task.title}"</p>
                    <p className="text-sm text-red-600 mb-2">{confirmModal.message}</p>
                    <p className="text-xs text-blue-600">💡 {confirmModal.suggestion}</p>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-700 mb-4">이 작업을 삭제하시겠습니까?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelDelete}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Undo 알림 */}
        {undoStack.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm font-medium">삭제된 항목 {undoStack.length}개</span>
              </div>
              <button
                onClick={performUndo}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-medium transition-colors"
              >
                실행 취소 (Ctrl+Z)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}