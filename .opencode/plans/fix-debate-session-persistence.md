# Fix: Persistencia de nombres de chats (Debate)

## Problema
Al recargar la página (F5), los chats de tipo Debate siempre aparecen como "Nuevo debate" en lugar del nombre personalizado que el usuario les dio.

## Causa raíz
El `activeSessionId` no se persiste en ningún lado. Al recargar:
1. `AIContext` se monta con `activeSessionId = null` (estado inicial)
2. Se cargan las sesiones desde IndexedDB
3. Se ordenan por `updatedAt` (más reciente primero)
4. Se activa `sessions[0].id` — pero esto puede no ser la sesión que el usuario estaba usando
5. Además, al renombrar una sesión, se actualiza su `updatedAt`, lo que cambia el orden y puede activar una sesión diferente

## Solución
Guardar `activeSessionId` en `localStorage` y restaurarlo al cargar el contexto.

---

## Cambios a realizar en `src/context/AIContext.jsx`

### 1. Función `switchDebateSession` (línea ~353)
**Antes:**
```javascript
const switchDebateSession = (id) => {
  setActiveSessionId(id);
};
```

**Después:**
```javascript
const switchDebateSession = (id) => {
  setActiveSessionId(id);
  localStorage.setItem('activeDebateSessionId', id);
};
```

### 2. Función `addDebateSession` (línea ~332-351)
Añadir `localStorage.setItem` después de `setActiveSessionId(id)`:

**Antes (líneas 347-350):**
```javascript
const id = await db.debateSessions.add(session);
session.id = id;
setDebateSessions(prev => [session, ...prev]);
setActiveSessionId(id);
```

**Después:**
```javascript
const id = await db.debateSessions.add(session);
session.id = id;
setDebateSessions(prev => [session, ...prev]);
setActiveSessionId(id);
localStorage.setItem('activeDebateSessionId', id);
```

### 3. Función `deleteDebateSession` (línea ~363-378)
Cuando se borra la sesión activa y se crea una nueva, ya se llama a `addDebateSession` que guarda en localStorage. Pero cuando se cambia a otra sesión existente, hay que actualizar:

**Antes (líneas 367-369):**
```javascript
if (filtered.length > 0) {
  setActiveSessionId(filtered[0].id);
```

**Después:**
```javascript
if (filtered.length > 0) {
  setActiveSessionId(filtered[0].id);
  localStorage.setItem('activeDebateSessionId', filtered[0].id);
```

### 4. Efecto `useEffect` de carga (línea ~159-172)
Restaurar `activeSessionId` desde localStorage con fallback:

**Antes (líneas 159-172):**
```javascript
if (sessions.length > 0) {
  setActiveSessionId(sessions[0].id);
} else {
  const newSession = {
    novelId: activeNovel.id,
    title: 'Nuevo debate',
    updatedAt: new Date().toISOString(),
    messages: []
  };
  const newId = await db.debateSessions.add(newSession);
  newSession.id = newId;
  setDebateSessions([newSession]);
  setActiveSessionId(newId);
}
```

**Después:**
```javascript
if (sessions.length > 0) {
  const savedSessionId = localStorage.getItem('activeDebateSessionId');
  const sessionExists = savedSessionId && sessions.some(s => String(s.id) === String(savedSessionId));
  setActiveSessionId(sessionExists ? Number(savedSessionId) : sessions[0].id);
} else {
  const newSession = {
    novelId: activeNovel.id,
    title: 'Nuevo debate',
    updatedAt: new Date().toISOString(),
    messages: []
  };
  const newId = await db.debateSessions.add(newSession);
  newSession.id = newId;
  setDebateSessions([newSession]);
  setActiveSessionId(newId);
  localStorage.setItem('activeDebateSessionId', newId);
}
```

### 5. Limpiar localStorage al cambiar de novela
Cuando se cambia de novela, limpiar el `activeDebateSessionId` para evitar mezclar sesiones de novelas diferentes. Añadir al inicio del `useEffect` de carga (línea ~116):

**Antes:**
```javascript
if (!activeNovel) {
  setDebateAgents(DEFAULT_DEBATE_AGENTS);
  setDebateSessions([]);
  setActiveSessionId(null);
  setOracleHistory([]);
  setLastRewrite('');
  return;
}
```

**Después:**
```javascript
if (!activeNovel) {
  setDebateAgents(DEFAULT_DEBATE_AGENTS);
  setDebateSessions([]);
  setActiveSessionId(null);
  setOracleHistory([]);
  setLastRewrite('');
  localStorage.removeItem('activeDebateSessionId');
  return;
}
```

---

## Resumen de cambios
| Ubicación | Cambio |
|-----------|--------|
| `switchDebateSession` | Guardar en localStorage al cambiar sesión |
| `addDebateSession` | Guardar en localStorage al crear sesión |
| `deleteDebateSession` | Guardar en localStorage al cambiar sesión activa tras borrar |
| `useEffect` de carga | Restaurar desde localStorage con fallback |
| `useEffect` cleanup | Limpiar localStorage al salir de la novela |
