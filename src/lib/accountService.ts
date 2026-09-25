import { 
  doc, 
  deleteDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { auth, db } from './firebase';

export interface PurgeAccountResult {
  success: boolean;
  error?: string;
  details?: {
    censusDeleted: boolean;
    surveysCleaned: number;
    eventsCleaned: number;
    reportsDeleted: number;
    messagesDeleted: number;
    authDeleted: boolean;
  };
}

/**
 * Permanently deletes a user's account and purges ALL their records across
 * the entire database:
 * - Censo Comunitario & Perfil Personal (colección `users/{uid}`)
 * - Encuestas (colección `surveys`: remueve userVotes, decrementa contadores de votos y voters)
 * - Eventos y Jornadas (colección `events`: remueve registrants y registrantsData)
 * - Reportes Ciudadanos (colección `reports`: elimina los reportes creados por el usuario)
 * - Mensajes y Chat (colecciones `direct_messages` y `messages` enviados por el usuario)
 * - Firebase Auth: Elimina las credenciales del usuario
 */
export async function purgeUserAccount(targetUid: string, isSelf: boolean = true): Promise<PurgeAccountResult> {
  const details = {
    censusDeleted: false,
    surveysCleaned: 0,
    eventsCleaned: 0,
    reportsDeleted: 0,
    messagesDeleted: 0,
    authDeleted: false,
  };

  try {
    // 1. Limpiar participación en todas las Encuestas (Surveys)
    try {
      const surveysSnap = await getDocs(collection(db, 'surveys'));
      for (const surveyDoc of surveysSnap.docs) {
        const surveyData = surveyDoc.data();
        let changed = false;
        const currentVotes = { ...(surveyData.votes || {}) };
        const currentUserVotes = { ...(surveyData.userVotes || {}) };
        let currentVoters = Array.isArray(surveyData.voters) ? [...surveyData.voters] : [];

        // Si el usuario votó en esta encuesta
        if (currentUserVotes[targetUid] !== undefined) {
          const votedIndex = currentUserVotes[targetUid];
          if (currentVotes[votedIndex] !== undefined) {
            currentVotes[votedIndex] = Math.max(0, (currentVotes[votedIndex] || 1) - 1);
          }
          delete currentUserVotes[targetUid];
          changed = true;
        }

        // Si estaba en el array de voters
        if (currentVoters.includes(targetUid)) {
          currentVoters = currentVoters.filter(id => id !== targetUid);
          changed = true;
        }

        if (changed) {
          await updateDoc(doc(db, 'surveys', surveyDoc.id), {
            votes: currentVotes,
            userVotes: currentUserVotes,
            voters: currentVoters,
          });
          details.surveysCleaned++;
        }
      }
    } catch (surveyErr) {
      console.warn('Aviso al limpiar encuestas:', surveyErr);
    }

    // 2. Limpiar registros en Eventos y Jornadas Comunitarias (Events)
    try {
      const eventsSnap = await getDocs(collection(db, 'events'));
      for (const eventDoc of eventsSnap.docs) {
        const eventData = eventDoc.data();
        let changed = false;
        let currentRegistrants = Array.isArray(eventData.registrants) ? [...eventData.registrants] : [];
        let currentRegistrantsData = Array.isArray(eventData.registrantsData) ? [...eventData.registrantsData] : [];

        if (currentRegistrants.includes(targetUid)) {
          currentRegistrants = currentRegistrants.filter(id => id !== targetUid);
          changed = true;
        }

        const initialLength = currentRegistrantsData.length;
        currentRegistrantsData = currentRegistrantsData.filter((r: any) => r.uid !== targetUid);
        if (currentRegistrantsData.length !== initialLength) {
          changed = true;
        }

        if (changed) {
          await updateDoc(doc(db, 'events', eventDoc.id), {
            registrants: currentRegistrants,
            registrantsData: currentRegistrantsData,
          });
          details.eventsCleaned++;
        }
      }
    } catch (eventErr) {
      console.warn('Aviso al limpiar eventos:', eventErr);
    }

    // 3. Eliminar Reportes Ciudadanos creados por el usuario
    try {
      const reportsQuery = query(collection(db, 'reports'), where('userId', '==', targetUid));
      const reportsSnap = await getDocs(reportsQuery);
      for (const reportDoc of reportsSnap.docs) {
        await deleteDoc(doc(db, 'reports', reportDoc.id));
        details.reportsDeleted++;
      }
    } catch (reportErr) {
      console.warn('Aviso al eliminar reportes:', reportErr);
    }

    // 4. Limpiar Mensajes y Mensajes Directos enviados por el usuario
    try {
      const pmsQuery = query(collection(db, 'direct_messages'), where('senderId', '==', targetUid));
      const pmsSnap = await getDocs(pmsQuery);
      for (const pmDoc of pmsSnap.docs) {
        await deleteDoc(doc(db, 'direct_messages', pmDoc.id));
        details.messagesDeleted++;
      }
    } catch (pmErr) {
      console.warn('Aviso al limpiar direct_messages:', pmErr);
    }

    try {
      const msgsQuery = query(collection(db, 'messages'), where('senderId', '==', targetUid));
      const msgsSnap = await getDocs(msgsQuery);
      for (const msgDoc of msgsSnap.docs) {
        await deleteDoc(doc(db, 'messages', msgDoc.id));
        details.messagesDeleted++;
      }
    } catch (msgErr) {
      console.warn('Aviso al limpiar messages:', msgErr);
    }

    // 5. Eliminar perfil de usuario y ficha de censo en `users`
    try {
      await deleteDoc(doc(db, 'users', targetUid));
      details.censusDeleted = true;
    } catch (userDocErr) {
      console.error('Error al eliminar documento del usuario:', userDocErr);
      throw userDocErr;
    }

    // 6. Si es auto-eliminación, eliminar el usuario de Firebase Auth
    if (isSelf && auth.currentUser && auth.currentUser.uid === targetUid) {
      try {
        await deleteUser(auth.currentUser);
        details.authDeleted = true;
      } catch (authErr: any) {
        console.warn('Nota sobre Auth deleteUser (p.ej. requires-recent-login), cerrando sesión:', authErr);
        await signOut(auth);
      }
      
      // Limpiar datos locales y de sesión
      localStorage.removeItem('seenResolvedReports');
      sessionStorage.clear();
    }

    return {
      success: true,
      details,
    };
  } catch (error: any) {
    console.error('Error general durante la eliminación de cuenta:', error);
    return {
      success: false,
      error: error?.message || 'Ocurrió un error al procesar el borrado total de la cuenta.',
      details,
    };
  }
}
