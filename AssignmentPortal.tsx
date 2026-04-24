
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Assignment, AssignmentSubmission, User } from '../types';
import { dbService } from '../services/dbService';
import { getEthiopianDateString } from '../lib/dateUtils';
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Upload, 
  Download, 
  ExternalLink,
  Sparkles,
  Trophy,
  ArrowRight
} from 'lucide-react';

interface AssignmentPortalProps {
  currentUser: User;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
}

export const AssignmentPortal: React.FC<AssignmentPortalProps> = ({ currentUser, assignments, submissions }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getSubmission = (assignmentId: string) => {
    return submissions.find(s => s.assignmentId === assignmentId && s.studentId === currentUser.id);
  };

  const handleUpload = async () => {
    if (!selectedAssignment || !uploadFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase');
      
      const storageRef = ref(storage, `submissions/${selectedAssignment.id}/${currentUser.id}/${uploadFile.name}`);
      const snapshot = await uploadBytes(storageRef, uploadFile);
      const fileUrl = await getDownloadURL(snapshot.ref);

      clearInterval(interval);
      setUploadProgress(100);

      const submission: AssignmentSubmission = {
        id: `sub-${Date.now()}`,
        assignmentId: selectedAssignment.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        submittedAt: new Date().toISOString(),
        fileUrl,
        status: 'submitted'
      };

      await dbService.syncSubmission(submission);
      
      await dbService.createNotification({
        userId: 'admin',
        title: 'New Assignment Submission',
        message: `${currentUser.name} submitted work for "${selectedAssignment.title}".`,
        type: 'assignment',
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/admin/submissions`
      });

      setSelectedAssignment(null);
      setUploadFile(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert('Failed to upload assignment. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const sortedAssignments = [...assignments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-[12px] border-black pb-12 relative"
      >
        <div className="absolute -bottom-3 left-0 w-32 h-3 ethiopian-gradient" />
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-1 bg-blue-600 rounded-full" />
            <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.5em]">National workset registry / auth.v9</p>
          </div>
          <h2 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-[0.75] text-slate-900">
            Module <br/>Tasks.
          </h2>
        </div>
        <div className="bg-black text-white p-6 rounded-[2rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(59,130,246,1)] text-center min-w-[200px]">
          <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Queue Status</p>
          <p className="text-3xl font-black italic uppercase italic">{assignments.length} Pending</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Assignment List */}
        <div className="lg:col-span-2 space-y-12">
          <div className="space-y-10">
            {sortedAssignments.length > 0 ? (
              sortedAssignments.map((assignment, idx) => {
                const submission = getSubmission(assignment.id);
                const isOverdue = new Date(assignment.dueDate) < new Date() && !submission;
                const isGraded = submission?.grade !== undefined;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.01, x: 4, y: -4 }}
                    key={assignment.id} 
                    className={`relative group bg-white p-10 rounded-[3.5rem] border-8 border-black transition-all cursor-pointer shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${selectedAssignment?.id === assignment.id ? 'ring-8 ring-blue-400' : ''}`}
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    {/* Status Badges */}
                    <div className="absolute -top-4 -left-4 flex flex-col gap-2 z-10">
                      {isGraded && (
                        <div className="bg-green-500 text-white px-4 py-2 rounded-2xl border-4 border-black font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                          <Trophy size={14} />
                          Graded
                        </div>
                      )}
                      {submission && !isGraded && (
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl border-4 border-black font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                          <CheckCircle size={14} />
                          Submitted
                        </div>
                      )}
                      {isOverdue && (
                        <div className="bg-rose-600 text-white px-4 py-2 rounded-2xl border-4 border-black font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 animate-pulse">
                          <AlertCircle size={14} />
                          Expired
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className="bg-black text-white px-5 py-2 rounded-xl border-2 border-white text-xs font-black uppercase tracking-widest shadow-md">
                          {assignment.courseCode}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                           <div className={`w-2 h-2 rounded-full ${submission ? 'bg-green-500' : isOverdue ? 'bg-rose-500' : 'bg-blue-500'}`} />
                           System ID: {assignment.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 font-black text-gray-500 uppercase">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar size={14} strokeWidth={3} />
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </div>
                        <span className="text-[9px] text-blue-600 tracking-tighter italic">
                          {getEthiopianDateString(assignment.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-none group-hover:text-blue-600 transition-colors">{assignment.title}</h3>
                      <p className="text-gray-500 font-bold italic line-clamp-2 leading-relaxed uppercase text-sm">{assignment.description}</p>
                    </div>

                    <div className="flex justify-between items-center pt-8 mt-6 border-t-8 border-black/5">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 px-6 py-2 rounded-2xl border-4 border-black font-black text-xl italic">
                          {assignment.points} <span className="text-xs uppercase not-italic opacity-50">Points</span>
                        </div>
                        {isGraded && (
                          <div className="bg-green-100 px-6 py-2 rounded-2xl border-4 border-black flex items-center gap-3">
                            <Sparkles size={18} className="text-green-600" />
                            <span className="font-black text-2xl text-green-700 italic">{submission.grade}<span className="text-xs opacity-50 not-italic">/{assignment.points}</span></span>
                          </div>
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-full border-4 border-black flex items-center justify-center bg-gray-50 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                         <ArrowRight size={24} strokeWidth={3} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="bg-gray-50 p-24 rounded-[5rem] border-8 border-black border-dashed text-center">
                <FileText size={80} className="mx-auto text-gray-200 mb-8" />
                <p className="text-3xl font-black text-gray-300 uppercase italic tracking-tighter">Vault Empty: No Tasks Registered.</p>
              </div>
            )}
          </div>

          {/* Sovereign Submission Registry */}
          <div className="mt-20 bg-slate-900 border-8 border-black rounded-[4rem] p-12 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                   <h4 className="text-4xl font-black uppercase italic tracking-tighter text-blue-400">Submission Registry</h4>
                   <div className="px-4 py-1 bg-blue-600/20 border border-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-400">Audit Active</div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left font-black uppercase text-xs">
                      <thead className="border-b-4 border-white/10 pb-4 text-gray-400">
                         <tr>
                            <th className="pb-4">Task ID</th>
                            <th className="pb-4">Timestamp</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4 text-right">Result</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-white/5">
                         {submissions.filter(s => s.studentId === currentUser.id).length > 0 ? (
                           submissions.filter(s => s.studentId === currentUser.id).map((sub, i) => (
                             <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-6 font-mono text-blue-400 italic">#{sub.id.slice(-6)}</td>
                                <td className="py-6 text-[10px]">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                <td className="py-6">
                                   <span className={`px-3 py-1 rounded-full border-2 ${sub.status === 'graded' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-blue-500/20 border-blue-500 text-blue-400'}`}>
                                      {sub.status}
                                   </span>
                                </td>
                                <td className="py-6 text-right text-xl italic">{sub.grade || '--'}</td>
                             </tr>
                           ))
                         ) : (
                           <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-600 italic">No historical data found in this cycle.</td>
                           </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        </div>

        {/* Details & Submission Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedAssignment ? (
              <motion.div 
                key="details"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-10 rounded-[4.5rem] border-8 border-black shadow-[20px_20px_0px_0px_rgba(59,130,246,1)] sticky top-24 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-3 ethiopian-gradient" />
                
                <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                   <h3 className="text-3xl font-black uppercase italic tracking-tighter">Manifest</h3>
                   <button onClick={() => setSelectedAssignment(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-black">✕</button>
                </div>
                
                <div className="space-y-10">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Directive Description</p>
                    <p className="font-bold text-gray-700 leading-relaxed italic text-lg uppercase">{selectedAssignment.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-6 rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Hard Deadline</p>
                      <p className="font-black italic text-sm">{new Date(selectedAssignment.dueDate).toLocaleDateString()}</p>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-2">{getEthiopianDateString(selectedAssignment.dueDate)}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Value Pts</p>
                      <p className="font-black italic text-3xl">{selectedAssignment.points}</p>
                    </div>
                  </div>

                  {selectedAssignment.rubricUrl && (
                    <motion.a 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={selectedAssignment.rubricUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-center gap-4 w-full py-5 bg-black text-white border-4 border-black rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-[6px_6px_0px_0px_rgba(59,130,246,1)] hover:bg-slate-800 transition-all"
                    >
                      <Download size={20} />
                      Download Rubric Guide
                    </motion.a>
                  )}

                  <div className="pt-10 border-t-8 border-black/5">
                    <h4 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
                       <Clock size={20} className="text-blue-600" />
                       Submission Logic
                    </h4>
                    
                    {getSubmission(selectedAssignment.id) ? (
                      <div className="space-y-8">
                        <div className="bg-green-50 p-8 rounded-[3rem] border-6 border-black border-dashed relative overflow-hidden">
                          <CheckCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-green-500/10" />
                          <div className="flex items-center gap-5 mb-6">
                            <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-black">
                              <CheckCircle size={24} strokeWidth={3} />
                            </div>
                            <div>
                              <p className="font-black uppercase text-xs text-green-600 tracking-widest leading-none mb-1">Authenticated</p>
                              <p className="text-[10px] font-bold text-gray-500 italic uppercase">{new Date(getSubmission(selectedAssignment.id)!.submittedAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <motion.a 
                            whileHover={{ x: 5 }}
                            href={getSubmission(selectedAssignment.id)!.fileUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest underline decoration-2 underline-offset-4"
                          >
                            <ExternalLink size={14} />
                            Verify Submitted Artifact
                          </motion.a>
                        </div>

                        {getSubmission(selectedAssignment.id)!.feedback && (
                          <div className="bg-blue-600 text-white p-8 rounded-[3.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                            <Sparkles size={40} className="absolute top-2 right-2 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-4">Mentor Evaluation</p>
                            <p className="font-black text-lg italic leading-tight uppercase tracking-tighter">"{getSubmission(selectedAssignment.id)!.feedback}"</p>
                            {getSubmission(selectedAssignment.id)!.gradedFileUrl && (
                              <a 
                                href={getSubmission(selectedAssignment.id)!.gradedFileUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 mt-6 bg-white text-blue-600 px-4 py-2 rounded-xl border-2 border-black font-black uppercase text-[9px] tracking-widest hover:bg-gray-100 scale-95"
                              >
                                <Download size={14} strokeWidth={3} />
                                Graded Media
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="relative group/upload">
                          <input 
                            type="file" 
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="hidden" 
                            id="assignment-upload"
                          />
                          <label 
                            htmlFor="assignment-upload"
                            className="flex flex-col items-center justify-center gap-6 w-full py-16 bg-gray-50 border-8 border-black border-dashed rounded-[3rem] cursor-pointer hover:bg-gray-100 transition-all hover:border-blue-600 group-hover/upload:scale-[1.02]"
                          >
                            <div className="w-20 h-20 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-lg group-hover/upload:bg-blue-600 group-hover/upload:text-white transition-colors">
                               <Upload size={32} strokeWidth={3} />
                            </div>
                            <div className="text-center">
                              <p className="font-black uppercase text-xl leading-none italic">{uploadFile ? uploadFile.name : 'Inject Knowledge File'}</p>
                              <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-widest">ENCRYPTED PDF, DOCX, ZIP</p>
                            </div>
                          </label>
                        </div>

                        {isUploading && (
                          <div className="w-full bg-slate-200 h-8 rounded-full border-4 border-black overflow-hidden shadow-inner p-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              className="bg-blue-600 h-full rounded-full flex items-center justify-end px-4 border-r-4 border-black"
                            >
                               <span className="text-[8px] font-black text-white">{uploadProgress}%</span>
                            </motion.div>
                          </div>
                        )}

                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleUpload}
                          disabled={!uploadFile || isUploading}
                          className={`w-full py-8 rounded-[2.5rem] border-8 border-black font-black uppercase text-2xl italic tracking-tighter shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all ${!uploadFile || isUploading ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50 grayscale' : 'bg-blue-600 text-white hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]'}`}
                        >
                          {isUploading ? 'SYNCHRONIZING...' : 'COMMIT WORK'}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-blue-50 p-16 rounded-[5rem] border-8 border-black border-dashed text-center flex flex-col items-center justify-center space-y-8"
              >
                <div className="w-32 h-32 bg-white rounded-[3rem] border-4 border-black flex items-center justify-center shadow-xl animate-bounce">
                   <AlertCircle size={64} className="text-blue-400" strokeWidth={3} />
                </div>
                <p className="text-2xl font-black text-blue-900 uppercase italic tracking-tighter leading-tight">Secure Line Waiting: Select a task to verify objectives.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

