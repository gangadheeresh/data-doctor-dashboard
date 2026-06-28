import React, { useState, useEffect, useRef } from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import PlotlyChart from '../components/PlotlyChart';
import GlassCard from '../components/GlassCard';
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  HelpCircle, 
  Sparkles,
  Bot,
  User,
  AlertCircle,
  Trash2
} from 'lucide-react';

const ChatPage = () => {
  const { selectedDataset } = useDataset();
  const { theme } = useTheme();
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Speech Recognition (Voice Query Bonus)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => setIsListening(true);
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Sync sessions & activeSessionId from localStorage on dataset change
  useEffect(() => {
    if (!selectedDataset) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    try {
      const saved = localStorage.getItem(`chat_sessions_${selectedDataset.id}`);
      const parsed = saved ? JSON.parse(saved) : [];
      let activeId = localStorage.getItem(`active_session_id_${selectedDataset.id}`);

      if (parsed.length === 0) {
        // Create initial default chat session
        const defaultSession = {
          id: 'session-' + Date.now(),
          title: 'New Conversation',
          messages: []
        };
        const newSessions = [defaultSession];
        localStorage.setItem(`chat_sessions_${selectedDataset.id}`, JSON.stringify(newSessions));
        localStorage.setItem(`active_session_id_${selectedDataset.id}`, defaultSession.id);
        setSessions(newSessions);
        setActiveSessionId(defaultSession.id);
      } else {
        setSessions(parsed);
        if (!activeId || !parsed.some(s => s.id === activeId)) {
          activeId = parsed[0].id;
          localStorage.setItem(`active_session_id_${selectedDataset.id}`, activeId);
        }
        setActiveSessionId(activeId);
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }, [selectedDataset]);

  // Scroll to bottom on new messages
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const updateSessionMessages = (sessionId, newMessages) => {
    if (!selectedDataset) return;
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          // If first user message, extract it as the title
          let title = s.title;
          if (s.title === 'New Conversation' || s.title === 'New Chat') {
            const firstUserMsg = newMessages.find(m => m.sender === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.text.length > 24 
                ? firstUserMsg.text.slice(0, 24) + '...' 
                : firstUserMsg.text;
            }
          }
          return { ...s, title, messages: newMessages };
        }
        return s;
      });
      localStorage.setItem(`chat_sessions_${selectedDataset.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim() || !selectedDataset || !activeSessionId) return;

    setError('');
    setQuery('');
    setLoading(true);

    const userMsg = { sender: 'user', text };
    const currentMessages = [...messages, userMsg];
    updateSessionMessages(activeSessionId, currentMessages);

    try {
      const response = await apiFetch('/query/chat', {
        method: 'POST',
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          query: text
        }),
      });

      const botMsg = {
        sender: 'bot',
        text: response.answer,
        table: response.table,
        chart: response.chart
      };
      
      updateSessionMessages(activeSessionId, [...currentMessages, botMsg]);
    } catch (err) {
      setError(err.message || 'Failed to process query.');
      const errMsg = { 
        sender: 'bot', 
        text: `An error occurred: ${err.message || 'Unable to connect to model.'}` 
      };
      updateSessionMessages(activeSessionId, [...currentMessages, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    if (!selectedDataset) return;
    const newSession = {
      id: 'session-' + Date.now(),
      title: 'New Conversation',
      messages: []
    };
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setActiveSessionId(newSession.id);
    localStorage.setItem(`chat_sessions_${selectedDataset.id}`, JSON.stringify(updatedSessions));
    localStorage.setItem(`active_session_id_${selectedDataset.id}`, newSession.id);
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    if (!selectedDataset) return;
    const updated = sessions.filter(s => s.id !== id);
    let nextActiveId = activeSessionId;
    
    if (activeSessionId === id) {
      if (updated.length > 0) {
        nextActiveId = updated[0].id;
      } else {
        const defaultSession = {
          id: 'session-' + Date.now(),
          title: 'New Conversation',
          messages: []
        };
        updated.push(defaultSession);
        nextActiveId = defaultSession.id;
      }
    }
    
    setSessions(updated);
    setActiveSessionId(nextActiveId);
    localStorage.setItem(`chat_sessions_${selectedDataset.id}`, JSON.stringify(updated));
    localStorage.setItem(`active_session_id_${selectedDataset.id}`, nextActiveId);
  };

  const handleSuggestion = (prompt) => {
    handleSend(prompt);
  };

  if (!selectedDataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <MessageSquare className="h-10 w-10 text-slate-600 mb-3 animate-float" />
        <p className="text-sm font-semibold">Select a dataset first to begin AI Data Chat</p>
      </div>
    );
  }

  const suggestionsList = [
    "How many rows are in the dataset?",
    "Show missing values summary",
    "Which column has the strongest correlation?",
    "Show top 10 categories",
  ];

  return (
    <div className="flex-1 flex h-[calc(100vh-64px)] min-h-0 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>

      {/* Left Sidebar: ChatGPT style chat sessions list */}
      <div className={`w-64 border-r flex flex-col shrink-0 ${
        theme !== 'midnight' 
          ? 'bg-slate-950/40 border-slate-900' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-900/50">
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/10"
          >
            <span>+ New Chat</span>
          </button>
        </div>
        
        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">History</p>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id);
                localStorage.setItem(`active_session_id_${selectedDataset.id}`, s.id);
              }}
              className={`group flex items-center justify-between p-3 rounded-xl text-[11px] font-medium transition-all cursor-pointer border ${
                activeSessionId === s.id
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : theme !== 'midnight'
                    ? 'bg-slate-900/20 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border-transparent'
                    : 'bg-white hover:bg-slate-100 text-slate-650 hover:text-slate-800 border-transparent shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all"
                title="Delete Chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 relative">
        {/* Chat Area Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
              <Bot className="h-12 w-12 text-indigo-400 mx-auto animate-float" />
              <h3 className="text-xl font-bold text-slate-200">
                AI Chat with {selectedDataset.filename}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ask questions in plain English. You can trigger statistics, group averages, correlations, or trend lines for your dataset.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 text-left">
                {suggestionsList.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(s)}
                    className={`p-3 border rounded-xl text-xs text-left transition-all ${
                      theme !== 'midnight'
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Bot Avatar */}
                  {msg.sender === 'bot' && (
                    <div className="h-8 w-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] rounded-2xl p-4 space-y-4 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : theme !== 'midnight'
                        ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    {/* Markdown/Text Content */}
                    <p className="text-xs whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Optional Table */}
                    {msg.table && (
                      <div className="overflow-x-auto border border-slate-800/40 rounded-xl mt-3">
                        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                          <thead>
                            <tr className={theme !== 'midnight' ? 'bg-slate-950/60' : 'bg-slate-50'}>
                              {Object.keys(msg.table[0] || {}).map((header) => (
                                <th key={header} className="p-2 border-b border-slate-800/40 text-slate-400 font-bold uppercase tracking-wider">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.table.map((row, rIdx) => (
                              <tr key={rIdx} className={theme !== 'midnight' ? 'hover:bg-slate-850/40' : 'hover:bg-slate-50'}>
                                {Object.values(row).map((val, cIdx) => (
                                  <td key={cIdx} className="p-2 border-b border-slate-800/20 text-slate-300">
                                    {val === null || val === undefined ? 'N/A' : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Optional Chart */}
                    {msg.chart && (
                      <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-850 mt-3">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">
                          {msg.chart.title || 'Suggested Visual'}
                        </p>
                        
                        {msg.chart.type === 'heatmap' ? (
                          <PlotlyChart
                            data={[{
                              z: msg.table ? msg.chart.columns.map(c1 => msg.chart.columns.map(c2 => {
                                const match = msg.table.find(t => (t['Column 1'] === c1 && t['Column 2'] === c2) || (t['Column 1'] === c2 && t['Column 2'] === c1));
                                return match ? match['Correlation'] : 1.0;
                              })) : [],
                              x: msg.chart.columns,
                              y: msg.chart.columns,
                              type: 'heatmap',
                              colorscale: 'Viridis'
                            }]}
                            className="h-64"
                            isChat={true}
                          />
                        ) : (
                          <PlotlyChart
                            data={[{
                              x: msg.table ? msg.table.map(r => r[msg.chart.x]) : [],
                              y: msg.table ? msg.table.map(r => r[msg.chart.y || '']) : [],
                              type: msg.chart.type === 'line' ? 'scatter' : msg.chart.type,
                              mode: msg.chart.type === 'line' ? 'lines+markers' : undefined,
                              marker: { color: 'rgba(99, 102, 241, 0.7)' }
                            }]}
                            layout={{
                              xaxis: { title: msg.chart.x },
                              yaxis: { title: msg.chart.y || 'Count' }
                            }}
                            className="h-64"
                            isChat={true}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.sender === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className={`rounded-2xl p-4 flex items-center gap-2 ${
                    theme !== 'midnight' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
                  }`}>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                    <span className="text-xs text-slate-400">AI is analyzing rows and compiling answers...</span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 max-w-md mx-auto">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Chat Box Footer */}
        <div className={`p-4 border-t ${
          theme !== 'midnight' ? 'bg-slate-950/80 border-slate-850' : 'bg-white border-slate-200'
        }`}>
          <div className="max-w-3xl mx-auto flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2.5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask anything about ${selectedDataset.filename}...`}
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-650 focus:outline-none text-sm"
              disabled={loading}
            />
            
            {/* Voice Input Button */}
            <button
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-colors ${
                isListening 
                  ? 'bg-red-500/20 text-red-400 animate-pulse'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice query'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-600 p-2 rounded-xl text-white transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
