# File: app.py (Versione Corretta e Semplificata)
import json
from flask import Flask, render_template, jsonify

# Inizializza l'applicazione Flask, specificando dove trovare i file
app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def home():
    """Questa è la rotta principale. Il suo unico compito è servire il file index.html."""
    return render_template('index.html')

@app.route('/api/questions')
def get_questions():
    """Questo è l'endpoint API. Il JavaScript lo chiamerà una sola volta
       all'avvio per scaricare tutte le domande in formato JSON."""
    try:
        with open('questions.json', 'r', encoding='utf-8') as f:
            questions = json.load(f)
        # Ritorna la lista di domande come risposta JSON
        return jsonify(questions)
    except FileNotFoundError:
        # Se il file delle domande non esiste, ritorna un errore JSON
        return jsonify({"error": "Il file delle domande non è stato trovato."}), 404

if __name__ == '__main__':
    # Questo blocco non viene usato da Gunicorn in Colab, ma è utile per test locali
    app.run(debug=True, port=5000)
