document.addEventListener('DOMContentLoaded', () => {
    const columns = document.querySelectorAll('.column');
    const taskContainers = document.querySelectorAll('.task-container');

    // 初期タスクのロード
    function loadTasks() {
        fetch('/get_tasks')
            .then(response => response.json())
            .then(data => {
                data.forEach(task => {
                    addTaskToDOM(task.title, task.description, task.assignee, task.status, task.id);
                });
            });
    }

    loadTasks();

    // ドラッグ＆ドロップ機能の追加
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    });

    taskContainers.forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
    });

    // タスク作成フォームの送信イベント
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);

    // タスク作成後に追加する関数
    function addTaskToDOM(title, description, assignee, status, id) {
        const taskContainer = document.querySelector(`#${status.toLowerCase()} .task-container`);
        const newTask = document.createElement('div');
        newTask.classList.add('task');
        newTask.setAttribute('draggable', 'true');
        newTask.setAttribute('data-id', id);
        newTask.innerHTML = `
            <h3>${title}</h3>
            <p class="description">
                ${description.slice(0, 100)}${description.length > 100 ? '...<button class="show-more" data-fulltext="' + description + '">+</button>' : ''}
            </p>
            <p><strong>Assignee:</strong> ${assignee}</p>
            <button class="edit-button" data-id="${id}">Edit</button>
            <button class="delete-button" data-id="${id}">Delete</button>
        `;
        taskContainer.appendChild(newTask);

        // 新しいタスクにイベントリスナーを追加
        newTask.addEventListener('dragstart', handleDragStart);
        newTask.querySelector('.delete-button').addEventListener('click', handleDeleteTask);
        newTask.querySelector('.edit-button').addEventListener('click', handleEditTask);
        if (description.length > 100) {
            newTask.querySelector('.show-more').addEventListener('click', handleShowMore);
        }
    }

    // ドラッグスタートイベント
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
    }

    // ドラッグオーバーイベント
    function handleDragOver(e) {
        e.preventDefault();
    }

    // ドロップイベント
    function handleDrop(e) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-id='${taskId}']`);
        const newStatus = e.target.closest('.column').id;

        const dropTarget = e.target.closest('.task-container') || e.target.closest('.column').querySelector('.task-container');
        if (dropTarget) {
            dropTarget.appendChild(taskElement);

            fetch(`/update_task/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            }).then(response => response.json())
              .then(data => {
                  console.log('Drop update response:', data);
                  if (data.message === 'Task updated successfully!') {
                      taskElement.closest('.column').id = newStatus;
                  }
              });
        }
    }

    // タスク作成フォーム送信イベント
    function handleTaskFormSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const assignee = document.getElementById('taskAssignee').value;

        fetch('/add_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: title, description: description, assignee: assignee }),
        }).then(response => response.json())
          .then(data => {
              console.log('Add task response:', data);
              if (data.message === 'Task added successfully!') {
                  addTaskToDOM(title, description, assignee, 'ToDo', data.id);
              }
          });
    }

    // タスク削除イベント
    function handleDeleteTask(e) {
        const taskId = e.target.dataset.id;
        fetch(`/delete_task/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(response => response.json())
          .then(data => {
              console.log('Delete task response:', data);
              if (data.message === 'Task deleted successfully!') {
                  e.target.closest('.task').remove();
              }
          });
    }

    // タスク詳細表示/非表示イベント
    function handleShowMore(e) {
        const fullText = e.target.dataset.fulltext;
        const parent = e.target.parentElement;
        if (e.target.innerText === '+') {
            parent.innerHTML = `${fullText}<button class="show-more" data-fulltext="${fullText}">-</button>`;
        } else {
            parent.innerHTML = `${fullText.slice(0, 100)}${fullText.length > 100 ? '...<button class="show-more" data-fulltext="' + fullText + '">+</button>' : ''}`;
        }
        parent.querySelector('.show-more').addEventListener('click', handleShowMore);
    }

    // タスク編集イベント
    function handleEditTask(e) {
        const taskId = e.target.dataset.id;
        const taskElement = document.querySelector(`[data-id='${taskId}']`);
        const title = taskElement.querySelector('h3').innerText;
        const descriptionElement = taskElement.querySelector('.description');
        const description = descriptionElement.innerText.replace('...', '');
        const assignee = taskElement.querySelector('p:nth-child(3)').innerText.replace('Assignee: ', '');

        // 編集用フォームを作成
        const editForm = document.createElement('div');
        editForm.classList.add('edit-form');
        editForm.innerHTML = `
            <input type="text" id="editTitle" value="${title}">
            <textarea id="editDescription">${description}</textarea>
            <input type="text" id="editAssignee" value="${assignee}">
            <button class="save-button" data-id="${taskId}">Save</button>
            <button class="cancel-button" data-id="${taskId}">Cancel</button>
        `;
        taskElement.dataset.originalContent = taskElement.innerHTML;  // 元の内容を保存
        taskElement.innerHTML = '';
        taskElement.appendChild(editForm);

        // イベントリスナーを追加
        editForm.querySelector('.save-button').addEventListener('click', handleSaveTask);
        editForm.querySelector('.cancel-button').addEventListener('click', handleCancelEdit);
    }

    // タスク編集キャンセルイベント
    function handleCancelEdit(e) {
        const taskId = e.target.dataset.id;
        const taskElement = document.querySelector(`[data-id='${taskId}']`);
        taskElement.innerHTML = taskElement.dataset.originalContent;  // 元の内容を復元
        taskElement.querySelector('.delete-button').addEventListener('click', handleDeleteTask);
        taskElement.querySelector('.edit-button').addEventListener('click', handleEditTask);
        if (taskElement.querySelector('.show-more')) {
            taskElement.querySelector('.show-more').addEventListener('click', handleShowMore);
        }
    }

    // タスク編集保存イベント
    function handleSaveTask(e) {
        const taskId = e.target.dataset.id;
        const taskElement = document.querySelector(`[data-id='${taskId}']`);
        const title = document.getElementById('editTitle').value;
        const description = document.getElementById('editDescription').value;
        const assignee = document.getElementById('editAssignee').value;

        fetch(`/update_task/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: title, description: description, assignee: assignee, status: taskElement.closest('.column').id }),
        }).then(response => response.json())
          .then(data => {
              console.log('Save task response:', data);
              if (data.message === 'Task updated successfully!') {
                  taskElement.innerHTML = `
                      <h3>${title}</h3>
                      <p class="description">${description.length > 100 ? description.slice(0, 100) + '...' : description}</p>
                      <p><strong>Assignee:</strong> ${assignee}</p>
                      <button class="edit-button" data-id="${taskId}">Edit</button>
                      <button class="delete-button" data-id="${taskId}">Delete</button>
                  `;
                  taskElement.querySelector('.delete-button').addEventListener('click', handleDeleteTask);
                  taskElement.querySelector('.edit-button').addEventListener('click', handleEditTask);
                  if (description.length > 100) {
                      taskElement.querySelector('.show-more').addEventListener('click', handleShowMore);
                  }
              }
          });
    }

    // 初期タスクのイベントリスナーを追加
    document.querySelectorAll('.task').forEach(task => {
        task.addEventListener('dragstart', handleDragStart);
        task.querySelector('.delete-button').addEventListener('click', handleDeleteTask);
        task.querySelector('.edit-button').addEventListener('click', handleEditTask);
        const showMoreButton = task.querySelector('.show-more');
        if (showMoreButton) {
            showMoreButton.addEventListener('click', handleShowMore);
        }
    });
});
