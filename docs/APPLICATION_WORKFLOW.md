# DevFlow - Chi tiết Luồng Hoạt động Ứng dụng

## Tổng quan Luồng Hoạt động

DevFlow là một ứng dụng quản lý thời gian với kiến trúc client-server, bao gồm:
- **Frontend**: React + TypeScript với Zustand state management
- **Backend**: Spring Boot + PostgreSQL với WebSocket real-time
- **Authentication**: Clerk JWT authentication
- **Real-time**: Yjs CRDT cho collaborative editing

## 1. Luồng Authentication & Login

### 1.1 Frontend Authentication Flow

#### Clerk Authentication Setup
```typescript
// src/App.tsx - Khởi tạo Clerk provider
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AppContent />
    </ClerkProvider>
  );
}
```

#### Token Management
```typescript
// src/lib/api/authContext.ts - Quản lý JWT token
class AuthContext {
  private tokenFetcher?: () => Promise<string | null>;

  setTokenFetcher(fetcher: () => Promise<string | null>) {
    this.tokenFetcher = fetcher;
  }

  async getToken(): Promise<string | null> {
    return this.tokenFetcher?.() ?? null;
  }
}

export const apiAuthContext = new AuthContext();
```

#### Token Fetching trong App
```typescript
// src/App.tsx - Lấy token từ Clerk
const { getToken, userId, isLoaded } = useAuth();

useEffect(() => {
  if (!isLoaded) return;

  // Cung cấp token fetcher cho API context
  apiAuthContext.setTokenFetcher(async () => {
    const token = await getToken({
      template: import.meta.env.VITE_CLERK_JWT_TEMPLATE,
      skipCache: true
    });
    return token ?? null;
  });

  // Cung cấp userId fetcher
  apiAuthContext.setUserIdFetcher(() => userId ?? null);
}, [getToken, userId, isLoaded]);
```

### 1.2 Backend Authentication Flow

#### JWT Filter
```java
// src/main/java/com/naammm/becore/security/JwtAuthenticationFilter.java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            // Parse JWT và lấy user info
            userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            logger.error("JWT authentication failed", e);
        }

        filterChain.doFilter(request, response);
    }
}
```

#### WebSocket Authentication
```java
// src/main/java/com/naammm/becore/websocket/JwtHandshakeInterceptor.java
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

        // Lấy token từ query parameter
        String token = getTokenFromRequest(request);

        if (token != null) {
            try {
                // Validate JWT và extract user info
                String userId = jwtService.extractUserId(token);
                attributes.put("userId", userId);
                return true;
            } catch (Exception e) {
                logger.error("WebSocket JWT validation failed", e);
                return false;
            }
        }

        return false;
    }

    private String getTokenFromRequest(ServerHttpRequest request) {
        HttpServletRequest servletRequest = ((ServletServerHttpRequest) request).getServletRequest();
        return servletRequest.getParameter("token");
    }
}
```

## 2. Luồng Workspace Management

### 2.1 Tạo Workspace

#### Frontend: Create Workspace Form
```typescript
// src/components/workspace/CreateWorkspaceDialog.tsx
export function CreateWorkspaceDialog() {
  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: CreateWorkspaceData) => {
      const token = await apiAuthContext.getToken();
      return api.createWorkspace(data, token);
    },
    onSuccess: (workspace) => {
      // Update workspace store
      useWorkspaceStore.getState().addWorkspace(workspace);
      // Navigate to new workspace
      navigate(`/app?workspace=${workspace.id}`);
    }
  });

  const handleSubmit = (data: CreateWorkspaceData) => {
    createWorkspaceMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Workspace name" />
      <textarea name="description" placeholder="Description" />
      <button type="submit">Create Workspace</button>
    </form>
  );
}
```

#### API Call
```typescript
// src/lib/api/workspace.ts
export const createWorkspace = async (data: CreateWorkspaceData, token: string) => {
  const response = await fetch('/api/workspaces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to create workspace');
  }

  return response.json();
};
```

#### Backend: Workspace Creation
```java
// src/main/java/com/naammm/becore/controller/WorkspaceController.java
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    public ResponseEntity<WorkspaceDTO> createWorkspace(
            @RequestBody CreateWorkspaceRequest request,
            @RequestHeader("Authorization") String token) {

        // Extract user ID from JWT token
        String userId = jwtService.extractUserId(token);

        Workspace workspace = workspaceService.createWorkspace(request, userId);

        return ResponseEntity.ok(WorkspaceDTO.from(workspace));
    }
}
```

#### Service Layer
```java
// src/main/java/com/naammm/becore/service/WorkspaceService.java
@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;

    @Transactional
    public Workspace createWorkspace(CreateWorkspaceRequest request, String ownerId) {
        // Create workspace entity
        Workspace workspace = Workspace.builder()
            .name(request.getName())
            .description(request.getDescription())
            .ownerId(ownerId)
            .build();

        workspace = workspaceRepository.save(workspace);

        // Add owner as member with admin role
        WorkspaceMember ownerMember = WorkspaceMember.builder()
            .workspaceId(workspace.getId())
            .userId(ownerId)
            .role(WorkspaceRole.ADMIN)
            .build();

        memberRepository.save(ownerMember);

        return workspace;
    }
}
```

### 2.2 Load Workspace Data

#### Frontend: Workspace Loading
```typescript
// src/pages/AppWrapper.tsx - Load workspace khi vào app
export default function AppWrapper() {
  const { userId } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

  // Load workspaces khi user đăng nhập
  const { data: userWorkspaces } = useQuery({
    queryKey: ['workspaces', userId],
    queryFn: () => api.getUserWorkspaces(),
    enabled: !!userId
  });

  // Set current workspace từ URL hoặc default
  useEffect(() => {
    if (userWorkspaces && userWorkspaces.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const workspaceId = urlParams.get('workspace');

      if (workspaceId) {
        const workspace = userWorkspaces.find(w => w.id === workspaceId);
        if (workspace) setCurrentWorkspace(workspace);
      } else {
        // Default to first workspace
        setCurrentWorkspace(userWorkspaces[0]);
      }
    }
  }, [userWorkspaces, setCurrentWorkspace]);

  if (!currentWorkspace) {
    return <WorkspaceSelection workspaces={userWorkspaces || []} />;
  }

  return (
    <YjsProvider workspaceId={currentWorkspace.id}>
      <AppContent />
    </YjsProvider>
  );
}
```

#### Backend: Get User Workspaces
```java
// WorkspaceController.java
@GetMapping
public ResponseEntity<List<WorkspaceDTO>> getUserWorkspaces(
        @RequestHeader("Authorization") String token) {

    String userId = jwtService.extractUserId(token);

    List<Workspace> workspaces = workspaceService.getUserWorkspaces(userId);

    return ResponseEntity.ok(
        workspaces.stream()
            .map(WorkspaceDTO::from)
            .collect(Collectors.toList())
    );
}
```

## 3. Luồng Task Management

### 3.1 Tạo Task

#### Frontend: Task Creation Form
```typescript
// src/components/tasks/TaskForm.tsx
export function TaskForm({ workspaceId }: { workspaceId: string }) {
  const createTaskMutation = useMutation({
    mutationFn: (taskData: CreateTaskData) => api.createTask(workspaceId, taskData),
    onSuccess: (newTask) => {
      // Update local store
      useTaskStore.getState().addTask(newTask);

      // Sync với Yjs để real-time
      const { ydoc } = useYjs();
      if (ydoc) {
        const yjsMap = ydoc.getMap('tasks');
        yjsMap.set(newTask.id, newTask);
      }
    }
  });

  const handleSubmit = (data: CreateTaskData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Task title" required />
      <textarea name="description" placeholder="Description" />
      <select name="priority">
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>
      <input type="datetime-local" name="dueDate" />
      <button type="submit">Create Task</button>
    </form>
  );
}
```

#### API Call
```typescript
// src/lib/api/task.ts
export const createTask = async (workspaceId: string, taskData: CreateTaskData) => {
  const token = await apiAuthContext.getToken();

  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...taskData,
      workspaceId
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create task');
  }

  return response.json();
};
```

#### Backend: Task Creation
```java
// src/main/java/com/naammm/becore/controller/TaskController.java
@PostMapping
public ResponseEntity<TaskDTO> createTask(
        @RequestBody CreateTaskRequest request,
        @RequestHeader("Authorization") String token) {

    String userId = jwtService.extractUserId(token);

    Task task = taskService.createTask(request, userId);

    return ResponseEntity.ok(TaskDTO.from(task));
}
```

#### Service Layer
```java
// src/main/java/com/naammm/becore/service/TaskService.java
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceMemberRepository memberRepository;

    @Transactional
    public Task createTask(CreateTaskRequest request, String userId) {
        // Validate workspace membership
        boolean isMember = memberRepository.existsByWorkspaceIdAndUserId(
            request.getWorkspaceId(), userId);

        if (!isMember) {
            throw new AccessDeniedException("User is not a member of this workspace");
        }

        // Get max order index for workspace
        Integer maxOrder = taskRepository.findMaxOrderIndexByWorkspaceId(request.getWorkspaceId());
        Integer nextOrder = maxOrder != null ? maxOrder + 1 : 0;

        // Create task
        Task task = Task.builder()
            .title(request.getTitle())
            .description(request.getDescription())
            .status(TaskStatus.TODO)
            .priority(request.getPriority())
            .dueDate(request.getDueDate())
            .userId(userId)
            .workspaceId(request.getWorkspaceId())
            .orderIndex(nextOrder)
            .build();

        return taskRepository.save(task);
    }
}
```

### 3.2 Load Tasks cho Workspace

#### Frontend: Task Loading với React Query
```typescript
// src/hooks/useTasks.ts
export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: () => api.getTasks(workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (tasks) => {
      // Sync với Zustand store
      useTaskStore.getState().setTasks(tasks);
    }
  });
}

// src/components/tasks/TaskList.tsx
export function TaskList({ workspaceId }: { workspaceId: string }) {
  const { data: tasks, isLoading, error } = useTasks(workspaceId);

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error loading tasks</div>;

  return (
    <div className="task-list">
      {tasks?.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
```

#### API Call
```typescript
// src/lib/api/task.ts
export const getTasks = async (workspaceId: string) => {
  const token = await apiAuthContext.getToken();

  const response = await fetch(`/api/tasks?workspaceId=${workspaceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }

  return response.json();
};
```

#### Backend: Get Tasks
```java
// TaskController.java
@GetMapping
public ResponseEntity<List<TaskDTO>> getTasks(
        @RequestParam String workspaceId,
        @RequestHeader("Authorization") String token) {

    String userId = jwtService.extractUserId(token);

    // Validate membership
    boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
    if (!isMember) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    List<Task> tasks = taskService.getTasksByWorkspace(workspaceId);

    return ResponseEntity.ok(
        tasks.stream()
            .map(TaskDTO::from)
            .collect(Collectors.toList())
    );
}
```

#### Service Layer với Caching
```java
// TaskService.java
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;

    @Cacheable(value = "tasks", key = "#workspaceId")
    public List<Task> getTasksByWorkspace(String workspaceId) {
        return taskRepository.findByWorkspaceIdOrderByOrderIndex(workspaceId);
    }

    @CacheEvict(value = "tasks", key = "#task.workspaceId")
    public Task updateTask(String taskId, UpdateTaskRequest request) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        // Update fields
        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getStatus() != null) task.setStatus(request.getStatus());
        // ... other fields

        return taskRepository.save(task);
    }
}
```

## 4. Luồng Real-time Collaboration

### 4.1 Yjs Setup và Connection

#### Frontend: Yjs Provider
```typescript
// src/contexts/YjsContext.tsx
export const YjsProvider: React.FC<YjsProviderProps> = ({ workspaceId, children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const initYjsConnection = async () => {
      const token = await getToken();

      // Create Yjs document
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Create WebSocket provider
      const provider = new WebsocketProvider(
        'ws://localhost:8989/ws/yjs',
        workspaceId,  // Room name
        ydoc,
        {
          params: { token },  // Auth token
          connect: true,
          maxBackoffTime: 5000,
        }
      );

      providerRef.current = provider;

      // Connection status listener
      provider.on('status', (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      });

      // Sync listener
      provider.on('sync', (isSynced: boolean) => {
        if (isSynced) {
          console.log('[Yjs] Fully synced with server');
        }
      });
    };

    initYjsConnection();

    return () => {
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, [workspaceId]);

  return (
    <YjsContext.Provider value={{
      ydoc: ydocRef.current,
      provider: providerRef.current,
      isConnected,
      workspaceId
    }}>
      {children}
    </YjsContext.Provider>
  );
};
```

#### Yjs Store Adapter
```typescript
// src/hooks/use-yjs-adapter.ts
export function useYjsAdapter<T>(
  yjsKey: string,
  store: any,
  options: {
    debugLabel: string;
    decode?: (value: any) => T;
    merge?: (prev: T | undefined, next: T) => T;
  }
) {
  const { ydoc } = useYjs();
  const { debugLabel, decode, merge } = options;

  useEffect(() => {
    if (!ydoc) return;

    const yjsMap = ydoc.getMap(yjsKey);

    // Sync Yjs -> Store
    const observer = () => {
      const yjsData = yjsMap.toJSON();
      const decodedData = decode ? Object.values(yjsData).map(decode) : Object.values(yjsData);
      store.setState({ [yjsKey]: decodedData });
    };

    yjsMap.observe(observer);

    // Sync Store -> Yjs
    const unsubscribe = store.subscribe((state: any) => {
      const storeData = state[yjsKey] || [];
      const yjsData = yjsMap.toJSON();

      // Handle additions/updates
      storeData.forEach((item: T) => {
        const itemId = (item as any).id;
        const existing = yjsData[itemId];

        if (!existing) {
          // New item
          yjsMap.set(itemId, item);
        } else if (merge) {
          // Merge conflicts
          const merged = merge(existing, item);
          yjsMap.set(itemId, merged);
        }
      });

      // Handle deletions
      Object.keys(yjsData).forEach(key => {
        if (!storeData.find((item: any) => item.id === key)) {
          yjsMap.delete(key);
        }
      });
    });

    return () => {
      yjsMap.unobserve(observer);
      unsubscribe();
    };
  }, [ydoc, yjsKey, store, decode, merge]);
}
```

### 4.2 Backend WebSocket Handler

#### Yjs WebSocket Connection
```java
// src/main/java/com/naammm/becore/websocket/YjsWebSocketHandler.java
@Slf4j
@Component
@RequiredArgsConstructor
public class YjsWebSocketHandler extends BinaryWebSocketHandler {

    private final YjsConnectionManager connectionManager;
    private final YjsDocumentManager documentManager;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String workspaceId = extractWorkspaceId(session);
        String userId = extractUserId(session);

        // Permission check
        boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
        if (!isMember) {
            session.close(new CloseStatus(4003, "Not a workspace member"));
            return;
        }

        // Register connection
        connectionManager.addConnection(workspaceId, userId, session);

        // Send stored updates for initial sync
        try {
            sendStoredUpdates(session, workspaceId);
        } catch (Exception e) {
            log.error("[Yjs] Failed to send stored updates: {}", e.getMessage());
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String workspaceId = extractWorkspaceId(session);
        String senderId = extractUserId(session);

        byte[] update = message.getPayload().array();

        // Store update in memory + database
        documentManager.storeUpdate(workspaceId, update, senderId);

        // Broadcast to other clients
        connectionManager.broadcastToWorkspace(workspaceId, senderId, message);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String workspaceId = extractWorkspaceId(session);
        String userId = extractUserId(session);

        if (workspaceId != null && userId != null) {
            connectionManager.removeConnection(workspaceId, userId, session);
        }
    }

    private void sendStoredUpdates(WebSocketSession session, String workspaceId) {
        byte[][] updates = documentManager.getAllUpdates(workspaceId);

        if (updates.length == 0) return;

        synchronized (session) {
            int batchSize = 100;
            for (int i = 0; i < updates.length; i += batchSize) {
                int end = Math.min(i + batchSize, updates.length);

                for (int j = i; j < end; j++) {
                    if (!session.isOpen()) return;

                    session.sendMessage(new BinaryMessage(updates[j]));
                }

                // Buffer drain delay
                if (end < updates.length) {
                    Thread.sleep(10);
                }
            }
        }
    }

    private String extractWorkspaceId(WebSocketSession session) {
        String uri = session.getUri().getPath();
        String[] parts = uri.split("/");
        return parts.length >= 4 && "yjs".equals(parts[2]) ? parts[3] : null;
    }

    private String extractUserId(WebSocketSession session) {
        return (String) session.getAttributes().get("userId");
    }
}
```

#### Connection Manager
```java
// src/main/java/com/naammm/becore/websocket/YjsConnectionManager.java
@Component
@Slf4j
public class YjsConnectionManager {

    private final Map<String, Map<String, WebSocketSession>> connections = new ConcurrentHashMap<>();

    public void addConnection(String workspaceId, String userId, WebSocketSession session) {
        connections.computeIfAbsent(workspaceId, k -> new ConcurrentHashMap<>())
                  .put(userId, session);
        log.info("[ConnectionManager] User {} connected to workspace {}", userId, workspaceId);
    }

    public void removeConnection(String workspaceId, String userId, WebSocketSession session) {
        Map<String, WebSocketSession> workspaceConnections = connections.get(workspaceId);
        if (workspaceConnections != null) {
            workspaceConnections.remove(userId, session);
            if (workspaceConnections.isEmpty()) {
                connections.remove(workspaceId);
            }
        }
    }

    public void broadcastToWorkspace(String workspaceId, String senderId, WebSocketMessage message) {
        Map<String, WebSocketSession> workspaceConnections = connections.get(workspaceId);
        if (workspaceConnections == null) return;

        workspaceConnections.forEach((userId, session) -> {
            // Don't send back to sender
            if (!userId.equals(senderId) && session.isOpen()) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    log.error("[ConnectionManager] Failed to send to user {}", userId);
                }
            }
        });
    }
}
```

### 4.3 Yjs Document Manager
```java
// src/main/java/com/naammm/becore/websocket/YjsDocumentManager.java
@Slf4j
@Component
@RequiredArgsConstructor
public class YjsDocumentManager {

    private final YjsUpdateService yjsUpdateService;
    private final Map<String, YjsDocumentState> workspaceStates = new ConcurrentHashMap<>();

    public YjsDocumentState getOrCreateState(String workspaceId) {
        return workspaceStates.computeIfAbsent(workspaceId, id -> {
            YjsDocumentState state = new YjsDocumentState(id);

            // Load from database if available
            try {
                List<byte[]> persistedUpdates = yjsUpdateService.loadUpdates(id);
                persistedUpdates.forEach(state::addUpdate);
                log.info("[YjsDocManager] Loaded {} updates for workspace {}", persistedUpdates.size(), id);
            } catch (Exception e) {
                log.error("[YjsDocManager] Failed to load updates: {}", e.getMessage());
            }

            return state;
        });
    }

    public void storeUpdate(String workspaceId, byte[] update, String userId) {
        YjsDocumentState state = getOrCreateState(workspaceId);
        state.addUpdate(update);

        // Async persistence
        try {
            yjsUpdateService.saveUpdate(workspaceId, update, userId);
        } catch (Exception e) {
            log.error("[YjsDocManager] Failed to persist update for workspace {}", workspaceId);
        }
    }

    public byte[][] getAllUpdates(String workspaceId) {
        YjsDocumentState state = getOrCreateState(workspaceId);
        return state.getAllUpdates();
    }
}
```

## 5. Luồng AI Integration

### 5.1 Global Chat Panel

#### Frontend: AI Chat Interface
```typescript
// src/components/ai/GlobalChatPanel.tsx
export function GlobalChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: nanoid(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await api.sendChatMessage(content);
      const aiMessage: ChatMessage = {
        id: nanoid(),
        content: response.content,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 text-white rounded-full p-3 shadow-lg"
      >
        💬
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white border rounded-lg shadow-xl">
          <ChatWindow messages={messages} onSendMessage={sendMessage} />
        </div>
      )}
    </div>
  );
}
```

#### API Call cho AI
```typescript
// src/lib/api/ai.ts
export const sendChatMessage = async (message: string) => {
  const token = await apiAuthContext.getToken();

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }

  return response.json();
};
```

### 5.2 Backend AI Service

#### AI Controller
```java
// src/main/java/com/naammm/becore/controller/AIController.java
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestBody ChatRequest request,
            @RequestHeader("Authorization") String token) {

        String userId = jwtService.extractUserId(token);

        String response = aiService.processChatMessage(request.getMessage(), userId);

        return ResponseEntity.ok(new ChatResponse(response));
    }

    @PostMapping("/suggest-tasks")
    public ResponseEntity<List<TaskSuggestion>> suggestTasks(
            @RequestBody TaskSuggestionRequest request,
            @RequestHeader("Authorization") String token) {

        String userId = jwtService.extractUserId(token);

        List<TaskSuggestion> suggestions = aiService.suggestTasks(userId, request.getContext());

        return ResponseEntity.ok(suggestions);
    }
}
```

#### AI Service Implementation
```java
// src/main/java/com/naammm/becore/service/AIService.java
@Service
@RequiredArgsConstructor
public class AIService {

    private final OpenAIClient openAIClient;
    private final TaskRepository taskRepository;
    private final UserPreferencesRepository preferencesRepository;

    public String processChatMessage(String message, String userId) {
        // Get user context
        List<Task> recentTasks = taskRepository.findRecentTasksByUserId(userId, 10);
        UserPreferences preferences = preferencesRepository.findByUserId(userId);

        // Build context for AI
        String context = buildUserContext(recentTasks, preferences);

        // Call OpenAI API
        ChatCompletionRequest request = ChatCompletionRequest.builder()
            .model("gpt-3.5-turbo")
            .messages(List.of(
                new ChatMessage("system", "You are a helpful study assistant for Vietnamese students. " + context),
                new ChatMessage("user", message)
            ))
            .maxTokens(500)
            .temperature(0.7)
            .build();

        ChatCompletionResult result = openAIClient.createChatCompletion(request);

        return result.getChoices().get(0).getMessage().getContent();
    }

    public List<TaskSuggestion> suggestTasks(String userId, String context) {
        // Analyze user's task patterns
        List<Task> completedTasks = taskRepository.findCompletedTasksByUserId(userId, 50);

        // Use AI to analyze patterns and suggest improvements
        String analysisPrompt = buildAnalysisPrompt(completedTasks, context);

        // Call OpenAI for suggestions
        // Return structured task suggestions
        return generateTaskSuggestions(analysisPrompt);
    }

    private String buildUserContext(List<Task> tasks, UserPreferences preferences) {
        // Build personalized context for AI
        StringBuilder context = new StringBuilder();
        context.append("User has completed ").append(tasks.size()).append(" tasks recently. ");

        if (preferences != null) {
            context.append("Preferred working hours: ").append(preferences.getPreferredHours()).append(". ");
            context.append("Study goals: ").append(preferences.getStudyGoals()).append(". ");
        }

        return context.toString();
    }
}
```

## 6. Luồng Error Handling & Recovery

### 6.1 Frontend Error Handling

#### API Error Boundary
```typescript
// src/components/error/ApiErrorBoundary.tsx
export class ApiErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('API Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### React Query Error Handling
```typescript
// src/hooks/useTasks.ts
export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: () => api.getTasks(workspaceId),
    retry: (failureCount, error) => {
      // Don't retry on 403/404 errors
      if (error instanceof ApiError && [403, 404].includes(error.status)) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### 6.2 Backend Error Handling

#### Global Exception Handler
```java
// src/main/java/com/naammm/becore/exception/GlobalExceptionHandler.java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        log.warn("Access denied: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("ACCESS_DENIED", e.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException e) {
        log.warn("Resource not found: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

#### WebSocket Error Handling
```java
// YjsWebSocketHandler.java
@Override
public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
    if (exception instanceof java.io.IOException &&
        exception.getMessage() != null &&
        exception.getMessage().contains("Broken pipe")) {
        log.debug("[Yjs] Client disconnected abruptly: sessionId={}", session.getId());
    } else {
        log.error("[Yjs] Transport error for session {}: {}", session.getId(), exception.getMessage());
    }

    // Graceful cleanup
    try {
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    } catch (Exception e) {
        log.debug("[Yjs] Failed to close session after transport error: {}", e.getMessage());
    }
}
```

## 7. Luồng Data Synchronization

### 7.1 Initial Data Load

#### Frontend: Parallel Data Loading
```typescript
// src/pages/AppWrapper.tsx
export default function AppWrapper() {
  const workspaceId = useWorkspaceStore(state => state.currentWorkspace?.id);

  // Parallel queries for initial data load
  const { data: tasks, isLoading: tasksLoading } = useTasks(workspaceId);
  const { data: documents, isLoading: docsLoading } = useDocuments(workspaceId);
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId);

  const isLoading = tasksLoading || docsLoading || membersLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app-content">
      <TaskList tasks={tasks || []} />
      <DocumentList documents={documents || []} />
      <MemberList members={members || []} />
    </div>
  );
}
```

### 7.2 Real-time Updates

#### Optimistic Updates
```typescript
// src/hooks/useTasks.ts
export function useUpdateTask() {
  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      api.updateTask(taskId, updates),

    // Optimistic update
    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks']);

      // Optimistically update cache
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        );
      });

      // Return context with snapshotted value
      return { previousTasks };
    },

    // Error handling - rollback
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },

    // Success - invalidate and refetch
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### 7.3 Conflict Resolution

#### Yjs CRDT Conflict Resolution
```typescript
// use-yjs-adapter.ts - Task merging logic
useYjsAdapter("tasks", useTaskStore, {
  debugLabel: "tasks",
  decode: (value) => {
    const task = value as Task;
    return {
      ...task,
      createdAt: parseDate(task.createdAt) ?? new Date(),
      updatedAt: parseDate(task.updatedAt) ?? new Date(),
      dueDate: parseDate(task.dueDate),
    };
  },
  merge: (prev, next) => {
    if (!prev) return next;

    // Last-write-wins for most fields
    const prevTime = prev.updatedAt?.getTime() || 0;
    const nextTime = next.updatedAt?.getTime() || 0;

    // But merge subtasks by ID
    const mergedSubtasks = [...(next.subtasks || [])];
    if (prev.subtasks) {
      prev.subtasks.forEach(prevSubtask => {
        if (!mergedSubtasks.find(s => s.id === prevSubtask.id)) {
          mergedSubtasks.push(prevSubtask);
        }
      });
    }

    return {
      ...(nextTime >= prevTime ? next : prev),
      subtasks: mergedSubtasks,
      updatedAt: new Date(Math.max(prevTime, nextTime)),
    };
  },
});
```

## 8. Performance Monitoring

### 8.1 Frontend Performance

#### React Query DevTools
```typescript
// src/main.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
```

#### Performance Metrics
```typescript
// src/lib/performance.ts
export const performanceMonitor = {
  startTiming: (key: string) => {
    performance.mark(`${key}-start`);
  },

  endTiming: (key: string) => {
    performance.mark(`${key}-end`);
    performance.measure(key, `${key}-start`, `${key}-end`);

    const measure = performance.getEntriesByName(key)[0];
    console.log(`[Performance] ${key}: ${measure.duration}ms`);

    // Send to analytics
    analytics.track('performance_metric', {
      name: key,
      duration: measure.duration
    });
  },

  measureApiCall: async (apiCall: () => Promise<any>, key: string) => {
    startTiming(key);
    try {
      const result = await apiCall();
      endTiming(key);
      return result;
    } catch (error) {
      endTiming(key);
      throw error;
    }
  }
};
```

### 8.2 Backend Performance

#### Spring Boot Actuator
```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

#### Custom Metrics
```java
// TaskService.java
@Service
@RequiredArgsConstructor
public class TaskService {

    private final MeterRegistry meterRegistry;
    private final Counter tasksCreated;
    private final Timer taskCreationTimer;

    public TaskService(MeterRegistry registry) {
        this.meterRegistry = registry;
        this.tasksCreated = Counter.builder("tasks.created")
            .description("Number of tasks created")
            .register(registry);

        this.taskCreationTimer = Timer.builder("tasks.creation.time")
            .description("Time taken to create tasks")
            .register(registry);
    }

    @Transactional
    public Task createTask(CreateTaskRequest request, String userId) {
        return taskCreationTimer.recordCallable(() -> {
            Task task = // ... create task logic
            tasksCreated.increment();
            return taskRepository.save(task);
        });
    }
}
```

---

## 📋 Tóm tắt Luồng Hoạt động

### 🔐 **Authentication Flow**
1. **Frontend**: Clerk handles login → JWT token
2. **Backend**: JWT filter validates token → extracts userId
3. **WebSocket**: Token passed as query param → validated on connect

### 🏢 **Workspace Flow**
1. **Create**: User → API call → DB save → return workspace
2. **Load**: Query workspaces → validate membership → return data
3. **Switch**: Update current workspace → reload data → Yjs reconnect

### ✅ **Task Management Flow**
1. **Create**: Form submit → API call → DB save → update stores → Yjs sync
2. **Load**: Query tasks → cache → display → Yjs sync
3. **Update**: Optimistic update → API call → DB update → sync all clients

### 🔄 **Real-time Collaboration Flow**
1. **Connect**: Yjs provider → WebSocket → permission check → send updates
2. **Update**: Local change → Yjs update → WebSocket send → broadcast
3. **Sync**: Receive updates → apply to local doc → update UI

### 🤖 **AI Integration Flow**
1. **Chat**: User message → API call → OpenAI → format response → display
2. **Suggestions**: Analyze user data → AI processing → return recommendations

### 📊 **Data Flow**
1. **Initial Load**: Parallel API calls → cache → display
2. **Updates**: Optimistic UI → API call → DB update → real-time sync
3. **Conflicts**: Yjs CRDT resolution → merge strategies → consistent state

Tất cả luồng đều được thiết kế để đảm bảo **consistency**, **performance**, và **user experience** tối ưu! 🚀