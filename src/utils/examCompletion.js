/**
 * Exam Completion Utilities
 * Handles auto-completion logic based on time and submissions
 */

import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * Check if exam should be marked as completed based on time
 * @param {Object} exam - Exam document data
 * @returns {boolean} - True if exam time has passed
 */
export const isExamTimeExpired = (exam) => {
  if (!exam.startTime || !exam.roundDurations) return false;

  const startDate = exam.startTime?.toDate ? exam.startTime.toDate() : 
                    exam.startTime?.seconds ? new Date(exam.startTime.seconds * 1000) : 
                    new Date(exam.startTime);

  const totalDuration = (exam.roundDurations.aptitude || 30) + (exam.roundDurations.core || 30);
  const endTime = new Date(startDate.getTime() + totalDuration * 60 * 1000);
  
  return new Date() > endTime;
};

/**
 * Get submission count for an exam
 * @param {string} examId - Exam ID
 * @returns {Promise<number>} - Number of submissions
 */
export const getExamSubmissionCount = async (examId) => {
  try {
    const q = query(collection(db, 'submissions'), where('examId', '==', examId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting submission count:', error);
    return 0;
  }
};

/**
 * Mark exam as completed
 * @param {string} examId - Exam ID
 * @returns {Promise<boolean>} - Success status
 */
export const markExamCompleted = async (examId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      status: 'completed',
      completedAt: new Date()
    });
    console.log(`✅ Exam ${examId} marked as completed`);
    return true;
  } catch (error) {
    console.error('Error marking exam as completed:', error);
    return false;
  }
};

/**
 * Auto-complete exams based on time expiration
 * Call this periodically or when admin views dashboard
 * @returns {Promise<number>} - Number of exams completed
 */
export const autoCompleteExpiredExams = async () => {
  try {
    const q = query(collection(db, 'exams'), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    
    let completedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const exam = { id: docSnap.id, ...docSnap.data() };
      
      if (isExamTimeExpired(exam)) {
        await markExamCompleted(exam.id);
        completedCount++;
      }
    }
    
    if (completedCount > 0) {
      console.log(`🔒 Auto-completed ${completedCount} expired exam(s)`);
    }
    
    return completedCount;
  } catch (error) {
    console.error('Error auto-completing exams:', error);
    return 0;
  }
};

/**
 * Check if all students have submitted (optional completion trigger)
 * @param {string} examId - Exam ID
 * @param {number} expectedCount - Expected number of students (optional)
 * @returns {Promise<boolean>} - True if all students submitted
 */
export const checkAllStudentsSubmitted = async (examId, expectedCount = null) => {
  try {
    const submissionCount = await getExamSubmissionCount(examId);
    
    // If expected count is provided, compare
    if (expectedCount !== null) {
      return submissionCount >= expectedCount;
    }
    
    // Otherwise, just return the count for manual decision
    return submissionCount;
  } catch (error) {
    console.error('Error checking submissions:', error);
    return false;
  }
};
