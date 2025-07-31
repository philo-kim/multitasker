import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, MoreHorizontal, Clock, CheckCircle, Circle, Sparkles, ChevronDown, ChevronRight, Play, Check, X, Edit2, Trash2 } from 'lucide-react';

export default function Multitasker() {
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

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
  const [addTaskTimeout, setAddTaskTimeout] = useState(null);
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const STORAGE_KEYS = {
    TODOS: 'multitasker_todos',
    DOING: 'multitasker_doing',
    DONE: 'multitasker_done',
    USER_LEVEL: 'multitasker_level',
    USER_XP: 'multitasker_xp'
  };

  const calculateXP = (action, taskComplexity = 1) => {
    const baseXP = {
      'TASK_COMPLETE': 50,
      'SUBTASK_COMPLETE': 10,
      'TASK_START': 5,
      'DAILY_STREAK': 25
    };
    return baseXP[action] * taskComplexity;
  };

  const getXPForNextLevel = (level) => level * 100;

  const addXP = useCallback((amount, source) => {
    setUserXP(prev => {
      let newXP = prev + amount;
      let currentLevel = userLevel;

      // 레벨업 처리
      while (newXP >= getXPForNextLevel(currentLevel)) {
        newXP -= getXPForNextLevel(currentLevel);
        currentLevel++;
        setUserLevel(currentLevel);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }

      // ✅ 레벨 다운 처리
      while (newXP < 0 && currentLevel > 1) {
        currentLevel--;
        newXP += getXPForNextLevel(currentLevel);
        setUserLevel(currentLevel);
      }

      // 1레벨에서는 XP가 0 아래로 안 내려감
      return Math.max(0, newXP);
    });
  }, [userLevel]);


  const saveToLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
      localStorage.setItem(STORAGE_KEYS.DOING, JSON.stringify(doingTasks));
      localStorage.setItem(STORAGE_KEYS.DONE, JSON.stringify(doneTasks));
      localStorage.setItem(STORAGE_KEYS.USER_LEVEL, userLevel.toString());
      localStorage.setItem(STORAGE_KEYS.USER_XP, userXP.toString());
    } catch (error) {
      console.error('저장 실패:', error);
    }
  };

  const loadFromLocal = () => {
    try {
      const savedTodos = localStorage.getItem(STORAGE_KEYS.TODOS);
      const savedDoing = localStorage.getItem(STORAGE_KEYS.DOING);
      const savedDone = localStorage.getItem(STORAGE_KEYS.DONE);
      const savedLevel = localStorage.getItem(STORAGE_KEYS.USER_LEVEL);
      const savedXP = localStorage.getItem(STORAGE_KEYS.USER_XP);

      if (savedTodos) setTodos(JSON.parse(savedTodos));
      if (savedDoing) setDoingTasks(JSON.parse(savedDoing));
      if (savedDone) setDoneTasks(JSON.parse(savedDone));
      if (savedLevel) setUserLevel(parseInt(savedLevel));
      if (savedXP) setUserXP(parseInt(savedXP));
    } catch (error) {
      console.error('불러오기 실패:', error);
    }
  };

  const saveStateForUndo = (action, data) => {
    const undoItem = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toLocaleString()
    };
    setUndoStack(prev => [undoItem, ...prev.slice(0, 99)]);
  };

  // Undo 실행 (서브태스크만)
  const performUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[0];
    setUndoStack(prev => prev.slice(1));

    if (lastAction.action === 'DELETE_SUBTASK') {
      setDoingTasks(prev => prev.map(task =>
        task.id === lastAction.data.taskId
          ? { ...task, subtasks: [...task.subtasks, lastAction.data.subtask] }
          : task
      ));
    }
  };

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

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (addTaskTimeout) {
        clearTimeout(addTaskTimeout);
      }
    };
  }, [addTaskTimeout]);

  // 👇 여기 바로 아래에 추가
  useEffect(() => {
    loadFromLocal();
  }, []);

  useEffect(() => {
    saveToLocal();
  }, [todos, doingTasks, doneTasks]);

  const breakDownTask = async (task, retryCount = 0) => {
    if (isBreakingDown.includes(task.id)) return;
    setIsBreakingDown(prev => [...prev, task.id]);

    try {
      const response = await fetch('/api/break-down-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.title }),
      });

      // 재시도 로직 추가
      if (!response.ok && retryCount < 2) {
        setIsBreakingDown(prev => prev.filter(id => id !== task.id));
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return breakDownTask(task, retryCount + 1);
      }

      const data = await response.json();

      if (response.status === 400 || data.error) {
        setConfirmModal({
          task: task,
          message: data.message || '분할할 수 없는 작업입니다',
          suggestion: data.suggestion || '더 구체적이고 실행 가능한 작업을 입력해주세요'
        });
        setIsBreakingDown(prev => prev.filter(id => id !== task.id));
        return;
      }

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
      if (retryCount < 2) {
        setIsBreakingDown(prev => prev.filter(id => id !== task.id));
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return breakDownTask(task, retryCount + 1);
      }

      const fallbackSubtasks = simulatedBreakdowns[task.title] || [
        { title: `${task.title} - 1단계`, description: "첫 번째 작업 단계", estimatedTime: "15분" },
        { title: `${task.title} - 2단계`, description: "두 번째 작업 단계", estimatedTime: "20분" }
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

    setIsBreakingDown(prev => prev.filter(id => id !== task.id));
  };

  const debouncedAddTask = useCallback(
    debounce(() => {
      if (!newTask.trim() || newTask.trim().length < 2) return;

      const trimmedTask = newTask.trim();
      if (todos.some(task => task.title === trimmedTask)) {
        setNewTask('');
        return;
      }

      const task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: trimmedTask,
        createdAt: new Date().toLocaleString()
      };

      setTodos(prev => [...prev, task]);
      setNewTask('');
    }, 300),
    [newTask, todos]
  );

  const addTask = () => {
    debouncedAddTask();
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setDoingTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        const willBeCompleted = !subtask.completed;

        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === subtaskId
            ? { ...subtask, completed: !subtask.completed }
            : subtask
        );

        // ✅ XP 지급/차감 로직
        if (willBeCompleted) {
          // 미완료 → 완료: XP 지급
          addXP(calculateXP('SUBTASK_COMPLETE'), `서브태스크 완료: ${subtask.title}`);
        } else {
          // 완료 → 미완료: XP 차감
          addXP(-calculateXP('SUBTASK_COMPLETE'), `서브태스크 취소: ${subtask.title}`);
        }

        const allCompleted = updatedSubtasks.every(subtask => subtask.completed);

        if (allCompleted) {
          addXP(calculateXP('TASK_COMPLETE', task.subtasks.length), `태스크 완료: ${task.title}`);

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

  // 대주제(전체 태스크) 삭제 (확인 팝업)
  const deleteMainTask = (taskId) => {
    const task = doingTasks.find(t => t.id === taskId);
    if (task && confirm(`"${task.title}" 전체 작업을 삭제하시겠습니까?`)) {
      setDoingTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };


  // 소주제(서브태스크) 삭제 (Undo 기능만)
  const deleteSubtask = (taskId, subtaskId) => {
    const task = doingTasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(s => s.id === subtaskId);

    if (task && subtask) {
      saveStateForUndo('DELETE_SUBTASK', { taskId, subtask });

      setDoingTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.filter(s => s.id !== subtaskId);

          if (updatedSubtasks.length === 0) {
            return null;
          }

          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      }).filter(Boolean));
    }
  };

  const startEditSubtask = (taskId, subtask) => {
    setEditingSubtask({
      taskId,
      subtaskId: subtask.id,
      title: subtask.title,
      description: subtask.description || '',
      estimatedTime: subtask.estimatedTime || ''
    });
  };

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

  const cancelSubtaskEdit = () => {
    setEditingSubtask(null);
  };

  const handleConfirmDelete = () => {
    if (confirmModal) {
      setTodos(prev => prev.filter(t => t.id !== confirmModal.task.id));
      setConfirmModal(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal(null);
  };

  // To do 작업 삭제 (확인 팝업)
  const deleteTodoTask = (taskId) => {
    const task = todos.find(t => t.id === taskId);
    if (task && confirm(`"${task.title}" 작업을 삭제하시겠습니까?`)) {
      setTodos(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const startEditTodo = (task) => {
    setEditingTodo({
      id: task.id,
      title: task.title
    });
  };

  const saveTodoEdit = () => {
    if (!editingTodo.title.trim()) return;

    setTodos(prev => prev.map(task =>
      task.id === editingTodo.id
        ? { ...task, title: editingTodo.title }
        : task
    ));

    setEditingTodo(null);
  };

  const cancelTodoEdit = () => {
    setEditingTodo(null);
  }; const TodoItem = ({ task }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group mb-3">
      {editingTodo && editingTodo.id === task.id ? (
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

  const rerollTask = async (taskId) => {
    const task = doingTasks.find(t => t.id === taskId);
    if (!task) return;

    // 다시 분할 중 상태로 설정
    setIsBreakingDown(prev => [...prev, taskId]);

    try {
      const response = await fetch('/api/break-down-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: task.title }),
      });

      const data = await response.json();

      if (response.status === 400 || data.error) {
        setIsBreakingDown(prev => prev.filter(id => id !== taskId));
        return;
      }

      const newSubtasks = data.subtasks.map((subtask, index) => ({
        id: Date.now() + index + Math.random(), // 고유성 보장
        title: subtask.title,
        description: subtask.description || '',
        estimatedTime: subtask.estimatedTime,
        completed: false
      }));

      const completedSubtasks = task.subtasks.filter(s => s.completed);
      const lostXP = completedSubtasks.length * calculateXP('SUBTASK_COMPLETE');

      if (lostXP > 0) {
        addXP(-lostXP, `리롤로 인한 진행도 초기화`);
      }

      // 기존 작업의 서브태스크만 교체
      setDoingTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, subtasks: newSubtasks, rerolledAt: new Date().toLocaleString() }
          : t
      ));

    } catch (error) {
      console.error('Reroll 실패:', error);
    }

    setIsBreakingDown(prev => prev.filter(id => id !== taskId));
  };

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
            {/* 👇 Reroll 버튼 추가 */}
            <button
              onClick={() => rerollTask(task.id)}
              disabled={isBreakingDown.includes(task.id)}
              className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
              title="다시 분할하기"
            >
              {isBreakingDown.includes(task.id) ? (
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
            <button
              onClick={() => deleteMainTask(task.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="전체 작업 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

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
                    onClick={saveSubtaskEdit}
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
              <div className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSubtask(task.id, subtask.id)}
                    className={`mt-0.5 transition-colors ${subtask.completed
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
                    <h5 className={`text-sm font-medium leading-5 ${subtask.completed
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
  ); return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
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
            ADHD 친화적 멀티태스킹 도구 - 큰 작업을 작은 단위로 나누어 관리를 도와드립니다
          </p>
        </div>

        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">Lv.{userLevel}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">멀티태스킹 마스터</h3>
                <p className="text-xs text-gray-500">다음 레벨까지 {getXPForNextLevel(userLevel) - userXP} XP</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userXP} XP</p>
              <p className="text-xs text-gray-500">총 {doneTasks.length}개 완료</p>
            </div>
          </div>

          {/* XP 진행바 */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(userXP / getXPForNextLevel(userLevel)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
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

        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              Doing
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                {doingTasks.length}
              </span>
            </h3>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100%-60px)] justify-start">
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

      {showLevelUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl animate-bounce">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">🎉</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">레벨 업!</h3>
              <p className="text-lg text-gray-700 mb-1">축하합니다! 레벨 {userLevel}에 도달했습니다!</p>
              <p className="text-sm text-gray-500">더 높은 생산성을 향해 나아가고 있어요! 🚀</p>
            </div>
          </div>
        </div>
      )}

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
      {/* 기능 소개 섹션 - 푸터 위에 추가 */}
      <section className="mt-16 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          ADHD 친화적 멀티태스킹의 특별함
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">AI 자동 분할</h3>
            <p className="text-sm text-gray-600">
              큰 작업을 ADHD에 최적화된 작은 단위로 자동 분할하여
              실행 가능한 단계로 만들어드립니다.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">진행률 시각화</h3>
            <p className="text-sm text-gray-600">
              각 작업의 진행 상황을 직관적으로 확인하고
              성취감을 느낄 수 있는 시각적 피드백을 제공합니다.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">멀티태스킹 지원</h3>
            <p className="text-sm text-gray-600">
              여러 작업을 동시에 진행하면서도
              각각의 진행도를 체계적으로 관리할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🧠 ADHD를 위한 특별한 설계
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">• 집중력 향상을 위한 기능</h4>
              <p className="text-blue-700">큰 작업을 작은 단위로 나누어 압박감을 줄이고 성취감을 높입니다.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">• 시각적 진행 추적</h4>
              <p className="text-blue-700">명확한 진행률 표시로 현재 상황을 한눈에 파악할 수 있습니다.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">• 유연한 작업 관리</h4>
              <p className="text-blue-700">언제든 수정, 삭제, 재분할이 가능하여 변화하는 상황에 대응합니다.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">• 실행 취소 기능</h4>
              <p className="text-blue-700">실수로 삭제한 작업을 쉽게 복구할 수 있는 안전망을 제공합니다.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}