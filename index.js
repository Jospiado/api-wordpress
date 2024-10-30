const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Para garantir que o corpo da requisição seja interpretado como JSON

// Configuração do Multer para armazenar os PDFs
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads')); // Pasta onde os PDFs serão salvos
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Manter o nome original do arquivo
    }
});
const upload = multer({ storage: storage });

// Função para verificar o CPF e retornar o caminho do arquivo
const verificarCpfNosPdfs = async (cpfInserido) => {
    const pdfDirectory = path.join(__dirname, 'uploads');
    const arquivosPdf = fs.readdirSync(pdfDirectory);
    const cpfLimpo = cpfInserido.replace(/[^\d]/g, '');

    for (const arquivo of arquivosPdf) {
        const pdfPath = path.join(pdfDirectory, arquivo);
        const dataBuffer = fs.readFileSync(pdfPath);

        try {
            const data = await pdfParse(dataBuffer);
            let texto = data.text;

            // Remove pontos, traços e qualquer caractere não numérico do texto extraído do PDF
            const textoLimpo = texto.replace(/[^\d]/g, '');

            // Verifica se o CPF existe no texto limpo do PDF
            if (textoLimpo.includes(cpfLimpo)) {
                console.log(`CPF encontrado no arquivo: ${arquivo}`);
                return {
                    status: 'success',
                    arquivo: pdfPath
                };
            }
        } catch (error) {
            console.error(`Erro ao processar o arquivo ${arquivo}:`, error);
        }
    }

    return { status: 'error', mensagem: 'CPF não encontrado em nenhum arquivo.' };
};

// Endpoint para consulta de CPF e download do PDF correspondente
app.post('/download-pdf', async (req, res) => {
    const { cpf } = req.body;

    if (!cpf) {
        return res.status(400).json({ status: 'error', mensagem: 'CPF é obrigatório' });
    }

    const resultado = await verificarCpfNosPdfs(cpf);

    if (resultado.status === 'success') {
        console.log(`Enviando o arquivo: ${resultado.arquivo}`);
        // Verifique se o arquivo realmente existe antes de tentar enviar
        if (fs.existsSync(resultado.arquivo)) {
            res.download(resultado.arquivo, (err) => {
                if (err) {
                    console.error('Erro ao fazer o download do arquivo:', err);
                    res.status(500).json({ status: 'error', mensagem: 'Erro ao fazer download do arquivo' });
                }
            });
        } else {
            console.error('Arquivo não encontrado:', resultado.arquivo);
            res.status(404).json({ status: 'error', mensagem: 'Arquivo não encontrado' });
        }
    } else {
        res.status(404).json(resultado);
    }
});


// Endpoint para upload de PDF e exibição do formulário de upload
app.get('/upload-pdf', (req, res) => {
    // Formulário HTML para upload
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload de PDF</title>
        </head>
        <body>
            <h1>Upload de PDF</h1>
            <form action="/upload-pdf" method="POST" enctype="multipart/form-data">
                <label for="pdf">Escolha um arquivo PDF:</label>
                <input type="file" id="pdf" name="pdf" accept="application/pdf" required>
                <button type="submit">Enviar PDF</button>
            </form>
        </body>
        </html>
    `);
});

// Endpoint para upload de PDF (via POST)
app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', mensagem: 'Nenhum arquivo enviado' });
    }

    res.send(`
        <h1>Upload realizado com sucesso!</h1>
        <p>Arquivo enviado: ${req.file.originalname}</p>
        <a href="/upload-pdf">Enviar outro arquivo</a>
    `);
});
// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
