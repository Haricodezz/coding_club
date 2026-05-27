'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  upvotes: number;
  created_at: string;
  is_pinned: boolean;
  users?: { username: string; avatar_url: string; role: string };
  userVote?: number;
}

interface DiscussionBoardProps {
  itemId: string;
  user: AppUser | null;
}

export function DiscussionBoard({ itemId, user }: DiscussionBoardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (itemId) fetchComments();
  }, [itemId, user]);

  async function fetchComments() {
    setLoading(true);
    const supabase = getSupabase();
    try {
      const { data, error } = await (supabase as any)
        .from('resource_comments')
        .select(`
          *,
          users (username, avatar_url, role)
        `)
        .eq('item_id', itemId)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (user && data) {
        // Fetch user's votes
        const { data: votes } = await (supabase as any)
          .from('resource_comment_votes')
          .select('comment_id, vote_type')
          .eq('user_id', user.id);
        
        const voteMap = (votes || []).reduce((acc: any, v: any) => {
          acc[v.comment_id] = v.vote_type;
          return acc;
        }, {});

        const enriched = data.map((c: any) => ({ ...c, userVote: voteMap[c.id] || 0 }));
        setComments(enriched);
      } else {
        setComments(data || []);
      }
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === 'string' ? err : '');
      const isTableMissing = err?.code === '42P01' || 
        errMsg.includes("Could not find the table 'public.resource_comments'") ||
        errMsg.includes("Could not find the table");

      if (isTableMissing) {
        console.warn('Comments table not found. Please run the schema migration (v15).');
      } else {
        console.error('Error fetching comments:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;
    
    setSubmitting(true);
    const supabase = getSupabase();
    try {
      const { data, error } = await (supabase as any)
        .from('resource_comments')
        .insert({
          item_id: itemId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`*, users (username, avatar_url, role)`)
        .single();
        
      if (error) throw error;
      setComments([data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(commentId: string, currentVote: number, voteType: number) {
    if (!user) {
      alert("Please login to vote");
      return;
    }

    const newVote = currentVote === voteType ? 0 : voteType;
    const voteDiff = newVote - currentVote;

    // Optimistic UI update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, upvotes: c.upvotes + voteDiff, userVote: newVote };
      }
      return c;
    }));

    const supabase = getSupabase();
    try {
      if (newVote === 0) {
        await (supabase as any).from('resource_comment_votes').delete().match({ comment_id: commentId, user_id: user.id });
      } else {
        await (supabase as any).from('resource_comment_votes').upsert({ comment_id: commentId, user_id: user.id, vote_type: newVote });
      }
      
      // Update the actual comment upvote count
      const { data: currentComment } = await (supabase as any).from('resource_comments').select('upvotes').eq('id', commentId).single();
      if (currentComment) {
        await (supabase as any).from('resource_comments').update({ upvotes: currentComment.upvotes + voteDiff }).eq('id', commentId);
      }
    } catch (err) {
      console.error('Error voting:', err);
      // Revert on error
      fetchComments();
    }
  }

  return (
    <div className="discussion-board" style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>💬</span> Community Discussion
      </h3>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <img 
              src={`/avatars/${user.avatar_url || 'avatar_0.svg'}`} 
              alt={user.username} 
              style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--color-border)' }} 
            />
            <div style={{ flex: 1 }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ask a question or share a tip about this resource..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  disabled={submitting || !newComment.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>You must be logged in to participate in the discussion.</p>
          <a href="/login" className="btn btn-primary btn-sm">Sign In</a>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2].map(i => (
            <div key={i} style={{ display: 'flex', gap: '1rem' }}>
              <div className="skeleton-box" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-box" style={{ width: '30%', height: 16, marginBottom: '0.5rem' }} />
                <div className="skeleton-box" style={{ width: '100%', height: 40 }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🍃</span>
          <p>No comments yet. Be the first to start the discussion!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {comments.map(comment => {
            const isMentor = comment.users?.role === 'super_admin' || comment.users?.role === 'team' || comment.users?.role === 'mentor';
            const userVote = comment.userVote || 0;

            return (
              <div key={comment.id} style={{ display: 'flex', gap: '1rem', opacity: comment.upvotes < -5 ? 0.5 : 1 }}>
                {/* Vote buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <button 
                    onClick={() => handleVote(comment.id, userVote, 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: userVote === 1 ? 'var(--brand-primary)' : 'var(--text-muted)', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={userVote === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: userVote !== 0 ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                    {comment.upvotes}
                  </span>
                  <button 
                    onClick={() => handleVote(comment.id, userVote, -1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: userVote === -1 ? 'var(--color-error)' : 'var(--text-muted)', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={userVote === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                </div>

                {/* Comment Content */}
                <div style={{ flex: 1, background: 'var(--color-surface)', border: `1px solid ${comment.is_pinned ? 'var(--accent)' : 'var(--color-border)'}`, borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={`/avatars/${comment.users?.avatar_url || 'avatar_0.svg'}`} alt={comment.users?.username} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{comment.users?.username || 'Unknown'}</span>
                      {isMentor && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(139,92,246,0.15)', color: 'var(--accent-3)', borderRadius: '4px', fontWeight: 700 }}>MENTOR</span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {comment.is_pinned && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 4h-2V2h-4v2H8v2h8V4zm-1 2v4l2 3v2h-4v7h-2v-7H7v-2l2-3V6h6z"/></svg>
                        PINNED
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
