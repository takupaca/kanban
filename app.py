from flask import Flask, render_template, request, jsonify
from models import db, Task
from flask_migrate import Migrate
from flask_cors import CORS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
CORS(app)
migrate = Migrate(app, db)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    tasks = Task.query.all()
    app.logger.info(f"Tasks from DB: {tasks}")
    return render_template('index.html', tasks=tasks)

@app.route('/add_task', methods=['POST'])
def add_task():
    data = request.json
    new_task = Task(
        title=data['title'], 
        description=data.get('description', ''), 
        assignee=data.get('assignee', ''),
        status='ToDo'  # デフォルトのステータスを設定
    )
    db.session.add(new_task)
    db.session.commit()
    app.logger.info(f"Task added: {new_task}")
    return jsonify({'message': 'Task added successfully!', 'id': new_task.id})

@app.route('/update_task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task = Task.query.get(task_id)
    if task:
        app.logger.info(f"Updating task {task_id} with data: {data}")
        task.title = data.get('title', task.title)
        task.description = data.get('description', task.description)
        task.assignee = data.get('assignee', task.assignee)
        task.status = data.get('status', task.status)
        db.session.commit()
        app.logger.info(f"Updated task {task_id}: {task}")
        return jsonify({'message': 'Task updated successfully!'})
    app.logger.error(f"Task {task_id} not found for update")
    return jsonify({'message': 'Task not found!'}), 404

@app.route('/get_tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    tasks_data = [
        {
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'assignee': task.assignee,
            'status': task.status
        }
        for task in tasks
    ]
    return jsonify(tasks_data)

@app.route('/delete_task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task:
        db.session.delete(task)
        db.session.commit()
        app.logger.info(f"Deleted task {task_id}")
        return jsonify({'message': 'Task deleted successfully!'})
    app.logger.error(f"Task {task_id} not found for deletion")
    return jsonify({'message': 'Task not found!'}), 404

if __name__ == '__main__':
    app.run(debug=True)
