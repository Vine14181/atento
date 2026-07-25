import { db } from '../firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDoc, writeBatch,
  deleteField, getDocs, increment
} from 'firebase/firestore';

/* ===================== TAREFAS ===================== */

export const subscribeToTasks = (uid, callback) => {
  if (!uid) return () => {};

  const q = query(
    collection(db, `users/${uid}/tasks`),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  });
};

export const addTask = async (uid, task) => {
  if (!uid) return;
  const taskId = task.id.toString();
  await setDoc(doc(db, `users/${uid}/tasks`, taskId), {
    ...task,
    uid,
    done: false,
    createdAt: new Date().toISOString()
  });
};

export const addMultipleTasks = async (uid, tasks) => {
  if (!uid) return;
  for (const task of tasks) {
    await addTask(uid, task);
  }
};

export const updateTask = async (uid, taskId, updates) => {
  if (!uid) return;
  await updateDoc(doc(db, `users/${uid}/tasks`, taskId.toString()), updates);
};

// Concluir = marcar como feita (a tarefa vai para "Concluídas", não some)
export const completeTask = async (uid, taskId) => {
  if (!uid) return;
  await updateTask(uid, taskId, {
    done: true,
    completedAt: new Date().toISOString()
  });
};

// Concluir várias de uma vez (botão "Concluir todas" do Diário)
export const completeAllTasks = async (uid, taskIds) => {
  if (!uid || taskIds.length === 0) return;
  const batch = writeBatch(db);
  const completedAt = new Date().toISOString();
  for (const taskId of taskIds) {
    batch.update(doc(db, `users/${uid}/tasks`, taskId.toString()), {
      done: true,
      completedAt
    });
  }
  await batch.commit();
};

export const removeTask = async (uid, taskId) => {
  if (!uid) return;
  await deleteDoc(doc(db, `users/${uid}/tasks`, taskId.toString()));
};

// Apaga TODAS as tarefas (botão do Perfil — exige confirmação na UI)
export const clearAllTasks = async (uid) => {
  if (!uid) return;
  const snap = await getDocs(collection(db, `users/${uid}/tasks`));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

/* ===================== HÁBITOS ===================== */

export const subscribeToHabits = (uid, callback) => {
  if (!uid) return () => {};

  const q = query(
    collection(db, `users/${uid}/habits`),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const habits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(habits);
  });
};

export const addHabit = async (uid, habit) => {
  if (!uid) return;
  const habitId = habit.id.toString();
  await setDoc(doc(db, `users/${uid}/habits`, habitId), {
    ...habit,
    uid,
    streak: 0,
    lastDone: null,
    count: 0,
    countDate: null,
    createdAt: new Date().toISOString()
  });
};

export const updateHabit = async (uid, habitId, updates) => {
  if (!uid) return;
  await updateDoc(doc(db, `users/${uid}/habits`, habitId.toString()), updates);
};

export const removeHabit = async (uid, habitId) => {
  if (!uid) return;
  await deleteDoc(doc(db, `users/${uid}/habits`, habitId.toString()));
};

// Marca/desmarca um hábito num dia específico (histórico para streak/consistência)
export const setHabitDone = async (uid, habitId, dateStr, done) => {
  if (!uid) return;
  await updateDoc(doc(db, `users/${uid}/habits`, habitId.toString()), {
    [`doneDates.${dateStr}`]: done ? true : deleteField(),
  });
};

/* ===================== PERFIL (energia, conquistas, contadores) ===================== */

export const subscribeToProfile = (uid, callback) => {
  if (!uid) return () => {};
  return onSnapshot(doc(db, `users/${uid}/profile`, 'main'), (snap) => {
    callback(snap.exists() ? snap.data() : {});
  });
};

export const updateProfile = async (uid, updates) => {
  if (!uid) return;
  await setDoc(doc(db, `users/${uid}/profile`, 'main'), updates, { merge: true });
};

export const incrementBreakerUses = async (uid) => {
  if (!uid) return;
  await setDoc(doc(db, `users/${uid}/profile`, 'main'), { breakerUses: increment(1) }, { merge: true });
};

/* ===================== ALARMES ===================== */

export const subscribeToAlarms = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, `users/${uid}/alarms`),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const addAlarm = async (uid, alarm) => {
  if (!uid) return;
  const alarmId = alarm.id.toString();
  await setDoc(doc(db, `users/${uid}/alarms`, alarmId), {
    ...alarm,
    uid,
    fired: false,
    createdAt: new Date().toISOString(),
  });
};

export const updateAlarm = async (uid, alarmId, updates) => {
  if (!uid) return;
  await updateDoc(doc(db, `users/${uid}/alarms`, alarmId.toString()), updates);
};

export const removeAlarm = async (uid, alarmId) => {
  if (!uid) return;
  await deleteDoc(doc(db, `users/${uid}/alarms`, alarmId.toString()));
};

/* ===================== MEMÓRIA RAM ===================== */

export const getRamCache = async (uid) => {
  if (!uid) return '';
  const docRef = doc(db, `users/${uid}/ram`, 'current');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().content || '';
  }
  return '';
};

export const saveRamCache = async (uid, content) => {
  if (!uid) return;
  await setDoc(doc(db, `users/${uid}/ram`, 'current'), {
    content,
    updatedAt: new Date().toISOString()
  });
};
