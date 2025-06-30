import os
import json
from flask import Flask, render_template, jsonify

# Inizializza l'applicazione Flask, specificando dove trovare i template e i file statici
app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def home():
    """Questa è la pagina principale. Carica l'HTML."""
    return render_template('index.html')

@app.route('/api/questions')
def get_questions():
    """Questo è l'endpoint API. Il nostro JavaScript lo chiamerà una sola volta
       per scaricare tutte le domande in formato JSON."""
    try:
        with open('questions.json', 'r', encoding='utf-8') as f:
            questions = json.load(f)
        return jsonify(questions)
    except FileNotFoundError:
        # Se il file delle domande non esiste, ritorna un errore
        return jsonify({"error": "Il file delle domande non è stato trovato."}), 404

if __name__ == '__main__':
    # Questo blocco viene eseguito solo se avvii il file direttamente con `python app.py`.
    # Non verrà eseguito quando useremo Gunicorn in Colab.
    app.run(debug=True, port=5000)