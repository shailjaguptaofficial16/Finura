import React, { useRef, useState } from 'react';
import { Bot, Eraser, RefreshCw, Send, Sparkles, User } from 'lucide-react';
import aiService from '../../services/aiService';
import './AIAssistant.css';

const suggestions = ['Mera spending pattern explain karo', 'Meri savings rate kya hai?', 'Mera emergency fund sufficient hai?', 'Mere goals mein sabse urgent kaunsa hai?', 'Mera financial summary batao'];
const formatText = (text) => String(text || '').split(/\n+/).map((line, index) => <p key={index}>{line}</p>);

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const send = async (event, value = input) => {
    event?.preventDefault();
    const message = value.trim();
    if (!message || loading) return;
    setInput(''); setError(''); setMessages((items) => [...items, { role: 'user', text: message }]); setLoading(true);
    try { const response = await aiService.assistant(message); setMessages((items) => [...items, { role: 'assistant', text: response.answer, disclaimer: response.disclaimer, intent: response.intent }]); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Finura AI is temporarily unavailable.'); }
    finally { setLoading(false); inputRef.current?.focus(); }
  };
  return <main className="ai-page"><section className="ai-shell"><header className="ai-header"><div className="ai-header-icon"><Bot size={24} /></div><div><span>Finura AI</span><h1>Your financial assistant</h1><p>Ask questions about your financial patterns, goals, savings, and planning.</p></div><button type="button" aria-label="Clear conversation" onClick={() => { setMessages([]); setError(''); }}><Eraser size={17} /></button></header><div className="ai-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => send(null, suggestion)} disabled={loading}><Sparkles size={14} />{suggestion}</button>)}</div><section className="ai-chat" aria-live="polite">{messages.length === 0 && <div className="ai-empty"><Bot size={32} /><h2>What would you like to understand?</h2><p>Finura AI explains your existing data. It cannot move money or change financial records.</p></div>}{messages.map((message, index) => <article className={`ai-message ai-message-${message.role}`} key={`${message.role}-${index}`}><div className="ai-message-icon">{message.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}</div><div className="ai-bubble">{formatText(message.text)}{message.disclaimer && <small>{message.disclaimer}</small>}</div></article>)}{loading && <article className="ai-message ai-message-assistant"><div className="ai-message-icon"><Bot size={16} /></div><div className="ai-bubble ai-typing"><i /><i /><i /></div></article>}{error && <div className="ai-error"><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}</section><form className="ai-input-row" onSubmit={send}><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Finura AI..." maxLength={2000} rows={1} disabled={loading} /><button type="submit" disabled={loading || !input.trim()} aria-label="Send message"><Send size={17} /></button></form><p className="ai-disclaimer">Finura AI provides general financial guidance, not professional financial advice. Verify important decisions independently.</p></section></main>;
}
