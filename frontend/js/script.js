document.addEventListener('DOMContentLoaded', () => {
    // URL base do seu backend
    const API_BASE_URL = 'https://kanban-js.onrender.com/api';

    const loginForm = document.getElementById('loginForm');
    const logoutButton = document.getElementById('logoutButton');
    const loggedInUserSpan = document.getElementById('loggedInUser');

    // Função para obter o token JWT do localStorage
    const getToken = () => localStorage.getItem('jwtToken');

    // Função para obter o usuário logado do localStorage
    const getCurrentUser = () => JSON.parse(localStorage.getItem('currentUser'));

    // Função para redirecionar para o login
    const redirectToLogin = () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    };

    // Lógica de Login
    if (loginForm) {
        // Redireciona se já estiver logado na página de login
        if (getToken() && getCurrentUser()) {
            window.location.href = 'index.html';
            return; // Impede a execução do restante do script para esta página
        }

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorMessage = document.getElementById('errorMessage');

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) { // Status 200 OK
                    localStorage.setItem('jwtToken', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    localStorage.setItem('userRole', data.role); // Armazena a role aqui
                    localStorage.setItem('userId', data.user.id); 
                    window.location.href = 'index.html';
                    fetchAndRenderTasks();
                    setupUIBasedOnRole();
                } else { // Status de erro (400, 500, etc.)
                    errorMessage.textContent = data.message || 'Erro ao fazer login.';
                }
            } catch (error) {
                console.error('Erro na requisição de login:', error);
                errorMessage.textContent = 'Não foi possível conectar ao servidor.';
            }
        });
    }

    // Lógica de Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', redirectToLogin);
    }

    const isKanbanPage = document.body.classList.contains('kanban-board-page') || document.querySelector('.kanban-board'); // Detecta se estamos na página Kanban

    if (isKanbanPage) {
        // Verifica se o usuário está logado, caso contrário, redireciona
        const token = getToken();
        const currentUser = getCurrentUser();

        if (!token || !currentUser) {
            redirectToLogin();
            return; // Para a execução do script
        }

        // Exibe o nome do usuário logado
        if (loggedInUserSpan) {
            loggedInUserSpan.textContent = `Olá, ${currentUser.username}!`;
        }

        // Elementos do DOM para o Kanban
        const toDoList = document.getElementById('to-do-list');
        const inProgressList = document.getElementById('in-progress-list');
        const doneList = document.getElementById('done-list');
        const addTaskButtons = document.querySelectorAll('.add-task-button'); // Seleciona todos os botões de adicionar tarefa
        const clearColumnButtons = document.querySelectorAll('.clear-column-button'); 

        // Elementos do Modal
        const taskModal = document.getElementById('taskModal');
        const closeButton = document.querySelector('.close-button');
        const taskForm = document.getElementById('taskForm');
        const modalTitle = document.getElementById('modalTitle');
        const taskIdInput = document.getElementById('taskId');
        const taskStatusInput = document.getElementById('taskStatus');
        const taskTitleInput = document.getElementById('taskTitle');
        const taskDescriptionInput = document.getElementById('taskDescription');
        const taskAssignedToSelect = document.getElementById('taskAssignedTo');
        const saveTaskButton = document.getElementById('saveTaskButton');

        let allUsers = []; // Armazenará a lista de todos os usuários

        // --- Funções Auxiliares para Manipulação de Dados e UI ---

        // Função para buscar todos os usuários do backend
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/users`, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Envia o token para autenticação
                    }
                });
                if (!response.ok) {
                    throw new Error('Falha ao buscar usuários.');
                }
                allUsers = await response.json();
                populateAssignedToSelect(); // Preenche o dropdown após buscar
            } catch (error) {
                console.error('Erro ao buscar usuários:', error);
                alert('Erro ao carregar usuários. Tente novamente mais tarde.');
            }
        };

        // Função para popular o dropdown "Atribuído a" no modal
        const populateAssignedToSelect = () => {
            taskAssignedToSelect.innerHTML = '<option value="">Não Atribuído</option>'; // Opção padrão
            allUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = user.username;
                taskAssignedToSelect.appendChild(option);
            });
        };

        // Função para criar um elemento de tarefa HTML
    const createTaskElement = (task) => {
    const taskDiv = document.createElement('div');
    taskDiv.classList.add('kanban-task');
    taskDiv.setAttribute('data-id', task._id); // Armazena o ID da tarefa
    taskDiv.setAttribute('draggable', true); // Permite arrastar e soltar

    let assignedUserName = 'Não Atribuído';
    if (task.assignedTo) {
        if (typeof task.assignedTo === 'object' && task.assignedTo.username) {
            assignedUserName = task.assignedTo.username;
        } else {
            const assignedUser = allUsers.find(user => user._id === task.assignedTo);
            assignedUserName = assignedUser ? assignedUser.username : 'Não Atribuído (ID não encontrado)';
        }
    };

    // Adiciona o botão de exclusão
    taskDiv.innerHTML = `
        <h4>${task.title}</h4>
        <p>${task.description || 'Sem descrição'}</p>
        <div class="task-assigned">Atribuído a: ${assignedUserName}</div>
        <button class="delete-task-button" data-id="${task._id}">Excluir</button> `;

    // -- LÓGICA DE VISIBILIDADE DO BOTÃO EXCLUIR --
    const deleteButton = taskDiv.querySelector('.delete-task-button');
    const loggedInUserId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    // console.log('--- Renderizando Tarefa ---');
    // console.log('Tarefa ID:', task._id);
    // console.log('Tarefa Criada por (task.createdBy):', task.createdBy);
    // console.log('Usuário Logado ID (loggedInUserId):', loggedInUserId);
    // console.log('Usuário Logado Role (userRole):', userRole);

    let isCreator = false;
    if (task.createdBy) { // Verificação para evitar TypeError
        isCreator = (loggedInUserId === task.createdBy.toString()); // <-- FOCO AQUI
    }

    const isAdmin = (userRole === 'admin');

    // console.log('É o criador? (isCreator):', isCreator); // NOVO LOG: o resultado da variável
    // console.log('É admin? (isAdmin):', isAdmin);       // NOVO LOG: o resultado da variável
    // console.log('-------------------------');
    
    if (deleteButton) {
    if (isCreator || isAdmin) {
        deleteButton.style.display = 'inline-block'; // Mostra o botão
        // console.log('Decisão: Mostrar botão de excluir. (É criador OU é admin)');
    } else {
        deleteButton.style.display = 'none'; // Oculta o botão
        // console.log('Decisão: Ocultar botão de excluir. (Não é criador E não é admin)');
    }
}
            // Adiciona listener para abrir modal de edição
            taskDiv.addEventListener('click', (e) => {
                if(!e.target.classList.contains('delete-task-button')) {
                    openTaskModal(task);
                }
            });

    // Event Listener para o novo botão de exclusão
    if (deleteButton) {
        deleteButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // Impede que o clique no botão ative o evento de clique da tarefa (openTaskModal)
            const taskId = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) { // Confirmação do usuário
                await deleteTask(taskId); // Chama a função para deletar
            }
        });
    }

    // Implementação básica de Drag & Drop (sem persistência ainda, apenas visual)
    taskDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task._id);
                e.dataTransfer.effectAllowed = 'move';
            });

            return taskDiv;
        };

        //Função delete
        const deleteTask = async (taskId) => {
            console.log('deleteTask: ID da tarefa a ser excluída:', taskId);
            const token = getToken();
            try {
                const url = `${API_BASE_URL}/tasks/${taskId}`;
                console.log('deleteTask: URL da requisição: ', url);

                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        redirectToLogin(); 
                        return;
                    }
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao exlcuir tarefa');
                }

                // Se excluir a tarefa, recarrega as tarefas e atuaiza a UI
                fetchAndRenderTasks();
                alert('Tarefa Excluida com sucesso!');
            } catch (error) {
                console.error('Erro ao exlcuir tarefa:', error);
                alert(error.message || 'Erro ao excluir tarefa.');
            }
        };

        // Função para renderizar todas as tarefas nas colunas corretas
        const renderTasks = (tasks) => {
            toDoList.innerHTML = '';
            inProgressList.innerHTML = '';
            doneList.innerHTML = '';

            tasks.forEach(task => {
                const taskElement = createTaskElement(task);
                if (task.status === 'to-do') {
                    toDoList.appendChild(taskElement);
                } else if (task.status === 'in-progress') {
                    inProgressList.appendChild(taskElement);
                } else if (task.status === 'done') {
                    doneList.appendChild(taskElement);
                }
            });
        };

        // Função para buscar e exibir as tarefas
        const fetchAndRenderTasks = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            // ... (tratamento de erro existente) ...
        }
        const tasks = await response.json();

        // --- ADICIONE ESTES CONSOLE.LOGS ---
        // console.log('--- Depuração de Tarefas ---');
        // console.log('Dados de tarefas recebidos pelo frontend (GET /api/tasks):', tasks);

        if (Array.isArray(tasks) && tasks.length > 0) {
            //  console.log('Primeira tarefa recebida:', tasks[0]);
            //  console.log('ID da primeira tarefa (tasks[0]._id):', tasks[0]._id);
            //  console.log('Status da primeira tarefa (tasks[0].status):', tasks[0].status);
            //  console.log('assignedTo da primeira tarefa (tasks[0].assignedTo):', tasks[0].assignedTo);
             // Se assignedTo for um objeto (populado), verifique:
             if (tasks[0].assignedTo && typeof tasks[0].assignedTo === 'object') {
                 console.log('Username do assignedTo:', tasks[0].assignedTo.username);
             }
        } else {
             console.log('Array de tarefas vazio ou não é um array:', tasks);
        }
        console.log('---------------------------');
        // --- FIM DOS CONSOLE.LOGS ADICIONADOS ---

        renderTasks(tasks); 
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        alert('Erro ao carregar tarefas. Tente novamente mais tarde.');
    }
    setupUIBasedOnRole();
};

    // Função Excluir tarefas
    const clearTasksByStatus = async (status = null) => {
        const token = getToken(); 
        console.log('clearTasksByStatus: Token JWT obtido:', token ? 'Token presente' : 'Token AUSENTE!'); // ADICIONE ISSO
    
        let confirmationMessage = 'Tem certeza que deseja limpar todas as tarefas ';
        if (status) {
            confirmationMessage += `da coluna "${status}"?`;
        } else {
            confimationMessage += 'existentes (todas as colunas)?'
        }

        if (!confirm(confirmationMessage)) {
            return; //usuario cancelou
        }

        try {
            let url = `${API_BASE_URL}/tasks`;
            if (status) {
                url += `?status=${status}`; //Adiciona o status na query string
            }
            console.log('clearTasksByStatus: URL da requisição DELETE:', url);

            const response = await fetch (url, {
                method: 'DELETE', 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('clearTasksByStatus: Resposta do backend não OK. Status:', response.status);
                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao limpar tarefas.');
            }

            const data = await response.json(); 
            alert(data.message);
            fetchAndRenderTasks(); //recarrega tarefas para atualizar o UI
        } catch (error) {
            console.error('Erro ao limpar tarefas:', error);
            alert(error.message || "Erro ao limpar tarefas.");
        }


    };

    function allowDrop(event) {
    event.preventDefault(); // Permite que a tarefa seja solta
}

async function drop(event) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain'); // Pega o ID da tarefa
    const targetColumn = event.target.closest('.kanban-column'); // Encontra a coluna alvo
    if (!targetColumn) return;

    const newStatus = targetColumn.querySelector('h2').getAttribute('data-status'); // Pega o novo status (se você tiver data-status no h2)
    // Se você não tiver data-status no h2, precisará obter o status de outra forma, ex:
    // const newStatus = targetColumn.id.replace('-list', ''); // Se o ID da lista é tipo 'to-do-list'

    console.log(`Tarefa ID: ${taskId} movida para o status: ${newStatus}`); // Log para depuração
    await updateTaskStatus(taskId, newStatus); // Chama a função para atualizar o status no backend
}

// --- NOVA FUNÇÃO: updateTaskStatus ---
const updateTaskStatus = async (taskId, newStatus) => {
    const token = getToken();
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, { // Endpoint PATCH
            method: 'PATCH', // Usamos PATCH para atualização parcial (apenas o status)
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus }) // Envia o novo status
        });

        if (!response.ok) {
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao atualizar status da tarefa.');
        }

        console.log('Status da tarefa atualizado com sucesso no backend.'); // Log de sucesso
        fetchAndRenderTasks(); // Recarrega as tarefas para atualizar a UI
    } catch (error) {
        console.error('Erro ao arrastar e soltar tarefa:', error);
        alert(error.message || 'Erro ao arrastar e soltar tarefa.');
    }
};

// -- FUNÇÃO PARA OCULTAR ELEMENTOS BASEADO NA ROLE --
const setupUIBasedOnRole = () => {
    const userRole = localStorage.getItem('userRole'); //armazena role no localstorage assim que loga
    const clearButtons = document.querySelectorAll('.clear-column-button');
    //const loggedInUsernameSpan = document.getElementById('logged-in-username');
    //const logoutButton = document.getElementById('logout-button');

    console.log('Frontend: Verificando role no setupUIBasedOnRole. Role:', userRole);

    if (userRole === 'admin') {
        clearButtons.forEach(button => button.style.display = 'inline-block'); //Mostra botão se for admin
    } else {
        clearButtons.forEach(button => button.style.display = 'none'); //Oculta botão se não for admin
    }
};


        // --- Lógica do Modal de Tarefas ---

        const openTaskModal = (task = null, status = 'to-do') => {
            taskForm.reset(); // Limpa o formulário

            if (task) {
                // Modo Edição
                modalTitle.textContent = 'Editar Tarefa';
                taskIdInput.value = task._id;
                taskTitleInput.value = task.title;
                taskDescriptionInput.value = task.description;
                taskAssignedToSelect.value = task.assignedTo || ''; // Seleciona o usuário atribuído
                taskStatusInput.value = task.status; // Mantém o status original
            } else {
                // Modo Adicionar
                modalTitle.textContent = 'Adicionar Nova Tarefa';
                taskIdInput.value = '';
                taskStatusInput.value = status; // Define o status inicial baseado no botão clicado
            }
            taskModal.style.display = 'flex'; // Exibe o modal
        };

        const closeTaskModal = () => {
            taskModal.style.display = 'none'; // Oculta o modal
        };

        // Event Listeners para o Modal
        closeButton.addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) { // Fecha se clicar fora do conteúdo do modal
                closeTaskModal();
            }
        });

        // Event Listener para os botões "Adicionar Tarefa"
        addTaskButtons.forEach(button => {
            button.addEventListener('click', () => {
                const status = button.getAttribute('data-status');
                openTaskModal(null, status);
            });
        });

        // Lógica de Submissão do Formulário de Tarefas
        taskForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const id = taskIdInput.value;
            const title = taskTitleInput.value;
            const description = taskDescriptionInput.value;
            const assignedTo = taskAssignedToSelect.value || null; // Null se não for atribuído
            const status = taskStatusInput.value; // Pega o status do campo hidden

            const taskData = { title, description, assignedTo, status };

            try {
                let response;
                if (id) {
                    // Atualizar Tarefa (PUT)
                    response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(taskData)
                    });
                } else {
                    // Criar Nova Tarefa (POST)
                    response = await fetch(`${API_BASE_URL}/tasks`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(taskData)
                    });
                }

                if (!response.ok) {
                    if (response.status === 401) redirectToLogin();
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao salvar tarefa.');
                }

                closeTaskModal();
                fetchAndRenderTasks(); // Recarrega as tarefas após salvar
            } catch (error) {
                console.error('Erro ao salvar tarefa:', error);
                alert(error.message || 'Erro ao salvar tarefa.');
            }
        });

        // Event Listener botão 'limpar coluna'
        if (clearColumnButtons) {
            clearColumnButtons.forEach(button => {
                button.addEventListener('click', async () => { 
                    const statusToClear = button.getAttribute('data-status');
                    await clearTasksByStatus(statusToClear);
                });
            });
        }

        // --- Inicialização da página Kanban ---
        fetchUsers();           // Carrega os usuários primeiro
        fetchAndRenderTasks();  // Depois, carrega e exibe as tarefas
        setupUIBasedOnRole();



        // --- Funcionalidade de Drag and Drop (sem persistência no DB ainda) ---
        const taskLists = document.querySelectorAll('.task-list');

        taskLists.forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault(); // Permite que o elemento seja solto
                list.classList.add('drag-over'); // Opcional: para feedback visual
            });

            list.addEventListener('dragleave', () => {
                list.classList.remove('drag-over');
            });

            list.addEventListener('drop', async (e) => {
                e.preventDefault();
                list.classList.remove('drag-over');

                const taskId = e.dataTransfer.getData('text/plain');
                const draggedTaskElement = document.querySelector(`.kanban-task[data-id="${taskId}"]`);
                
                if (draggedTaskElement) {
                    const newStatus = list.id.replace('-list', ''); // 'to-do-list' -> 'to-do'

                    // Opcional: Atualizar visualmente imediatamente
                    list.appendChild(draggedTaskElement);

                    // Atualizar a tarefa no backend
                    try {
                        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
                            method: 'PATCH', // Usamos PATCH para atualizar parcialmente
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: newStatus })
                        });

                        if (!response.ok) {
                            if (response.status === 401) redirectToLogin();
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Erro ao atualizar status da tarefa.');
                        }
                        // Se a atualização visual foi feita antes, talvez não precise recarregar tudo
                        // fetchAndRenderTasks(); 
                    } catch (error) {
                        console.error('Erro ao arrastar e soltar tarefa:', error);
                        alert(error.message || 'Erro ao mover tarefa. Recarregue a página.');
                        fetchAndRenderTasks(); // Recarrega para corrigir visual se erro
                    }
                }
            });
        });

    }
});
