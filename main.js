// Aguarda o carregamento completo do DOM antes de executar o código
document.addEventListener('DOMContentLoaded', () => {
    console.log('Arquivo main.js carregado com sucesso!');

    // Seleciona os elementos do HTML
    const botao = document.getElementById('btn-acao');
    const mensagem = document.getElementById('mensagem');
    
    let contador = 0;

    // Adiciona um evento de clique ao botão
    botao.addEventListener('click', () => {
        contador++;
        mensagem.textContent = `Você clicou no botão ${contador} ${contador === 1 ? 'vez' : 'vezes'}!`;
        
        // Altera a cor do texto dinamicamente
        mensagem.style.color = '#27ae60';
        mensagem.style.fontWeight = 'bold';
    });
});
