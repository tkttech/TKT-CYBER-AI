import axios from 'axios';

const FALLBACK_QUOTES = [
  { anime: 'Naruto', character: 'Naruto Uzumaki', quote: 'I will become Hokage!' },
  { anime: 'One Piece', character: 'Monkey D. Luffy', quote: 'I\'m going to be the King of the Pirates!' },
  { anime: 'Bleach', character: 'Ichigo Kurosaki', quote: 'I\'m not fighting because I want to win, I\'m fighting because I have to win.' },
  { anime: 'Dragon Ball Z', character: 'Vegeta', quote: 'It\'s over 9000!' },
  { anime: 'Attack on Titan', character: 'Eren Yeager', quote: 'If you win, you live. If you lose, you die. If you don\'t fight, you can\'t win!' },
  { anime: 'Fullmetal Alchemist: Brotherhood', character: 'Edward Elric', quote: 'A lesson without pain is meaningless.' },
  { anime: 'Death Note', character: 'L', quote: 'I am Justice!' },
  { anime: 'Cowboy Bebop', character: 'Spike Spiegel', quote: 'Whatever happens, happens.' },
  { anime: 'Code Geass', character: 'Lelouch Lamperouge', quote: 'To defeat evil, I must become a greater evil.' },
  { anime: 'Gurren Lagann', character: 'Kamina', quote: 'Don\'t believe in yourself. Believe in me! Believe in the Kamina who believes in you!' }
];

export default async function getQuote() {
  try {
    const r = await axios.get('https://animechan.xyz/api/random');
    return r.data;
  } catch {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
}
