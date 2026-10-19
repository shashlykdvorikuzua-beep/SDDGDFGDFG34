import React, { useState } from 'react';
import { 
  Shield, Check, ArrowRight, Copy, CheckCircle2, Lock, 
  AlertTriangle, KeyRound, Eye, EyeOff, Sparkles, RefreshCw, Smartphone
} from 'lucide-react';
import { WalletAccount } from '../../types/wallet';

interface TrustWalletOnboardingProps {
  onComplete: (wallet: WalletAccount, pin: string) => void;
}

type OnboardingStep = 
  | 'welcome' 
  | 'create_pin' 
  | 'confirm_pin' 
  | 'backup_notice' 
  | 'show_phrase' 
  | 'verify_phrase' 
  | 'import_phrase' 
  | 'success';

const SAMPLE_MNEMONIC_POOL = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
  'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
  'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
  'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
  'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
  'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
  'avoid', 'awake', 'aware', 'awesome', 'awful', 'awkward', 'axis', 'baby',
  'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo',
  'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic',
  'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef',
  'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench',
  'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid',
  'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade',
  'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom',
  'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil',
  'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow',
  'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand',
  'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright',
  'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown',
  'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk',
  'bullet', 'bundle', 'bunny', 'burden', 'burger', 'burst', 'bus', 'business',
  'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus',
  'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can', 'canal',
  'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital',
  'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry', 'cart',
  'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch',
  'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery',
  'cement', 'census', 'century', 'cereal', 'certain', 'chair', 'chalk', 'champion',
  'change', 'chaos', 'chapter', 'charge', 'chase', 'cheap', 'check', 'cheese',
  'chef', 'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney', 'choice',
  'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'citizen', 'city', 'civil',
  'claim', 'clap', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever',
  'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog',
  'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch',
  'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect',
  'color', 'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company',
  'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince',
  'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct',
  'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin', 'cover',
  'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane', 'crash', 'crater',
  'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket', 'crime',
  'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel',
  'cruise', 'crumble', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup',
  'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute',
  'cycle', 'dad', 'damage', 'damp', 'dance', 'danger', 'daring', 'dash',
  'daughter', 'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december',
  'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy',
  'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny',
  'depart', 'depend', 'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert',
  'design', 'desk', 'despair', 'destroy', 'detail', 'detect', 'develop', 'device',
  'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet',
  'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt',
  'disagree', 'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance',
  'divert', 'divide', 'divorce', 'dizzy', 'doctor', 'document', 'dog', 'doll',
  'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door', 'dose', 'double',
  'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress',
  'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry',
  'duck', 'dumb', 'dune', 'during', 'dust', 'dutch', 'duty', 'dwarf',
  'dynamic', 'eager', 'eagle', 'early', 'earn', 'earth', 'easily', 'east',
  'easy', 'echo', 'ecology', 'economy', 'edge', 'edit', 'educate', 'effort',
  'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element',
  'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge',
  'emotion', 'employ', 'empower', 'empty', 'enable', 'encourage', 'end', 'endless',
  'endorse', 'enemy', 'energy', 'enforce', 'engage', 'engine', 'enhance', 'enjoy',
  'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter', 'entire', 'entry',
  'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion',
  'error', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics',
  'evidence', 'evil', 'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange',
  'excite', 'exclude', 'excuse', 'execute', 'exercise', 'exhaust', 'exhibit', 'exile',
  'exist', 'exit', 'exotic', 'expand', 'expect', 'expire', 'explain', 'expose',
  'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty',
  'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous',
  'fan', 'fancy', 'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father',
  'fatigue', 'fault', 'favorite', 'feature', 'february', 'federal', 'fee', 'feed',
  'feel', 'female', 'fence', 'festival', 'fetch', 'fever', 'few', 'fiber',
  'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find',
  'fine', 'finger', 'finish', 'fire', 'firm', 'fiscal', 'fish', 'fit',
  'fitness', 'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flee',
  'flight', 'flip', 'float', 'flock', 'floor', 'flower', 'fluid', 'flush',
  'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow', 'food',
  'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward',
  'fossil', 'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh',
  'friend', 'fringe', 'frog', 'front', 'frost', 'frown', 'frozen', 'fruit',
  'fuel', 'fun', 'funny', 'furnace', 'fury', 'future', 'gadget', 'gain',
  'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden', 'garlic',
  'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general',
  'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift',
  'giggle', 'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare',
  'glass', 'glide', 'glimpse', 'globe', 'gloom', 'glory', 'glove', 'glow',
  'glue', 'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla', 'gospel',
  'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape',
  'grass', 'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery',
  'group', 'grow', 'grunt', 'guard', 'guess', 'guide', 'guilt', 'guitar',
  'gun', 'gym', 'habit', 'hair', 'half', 'hammer', 'hamster', 'hand',
  'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hat', 'have', 'hawk',
  'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello',
  'helmet', 'help', 'hen', 'hero', 'hip', 'hire', 'history', 'hobby',
  'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood',
  'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour',
  'hover', 'hub', 'huge', 'human', 'humble', 'humor', 'hundred', 'hungry',
  'hunt', 'hurdle', 'hurry', 'hurt', 'husband', 'hybrid', 'ice', 'icon',
  'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness', 'image',
  'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch',
  'include', 'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant',
  'inflict', 'inform', 'initial', 'inject', 'inmate', 'inner', 'innocent', 'input',
  'inquiry', 'insane', 'insect', 'inside', 'inspire', 'install', 'intact', 'interest',
  'into', 'invest', 'invite', 'involve', 'iron', 'island', 'isolate', 'issue',
  'item', 'ivory', 'jacket', 'jaguar', 'jar', 'jazz', 'jealous', 'jeans',
  'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge',
  'juice', 'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen',
  'keep', 'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom',
  'kiss', 'kit', 'kitchen', 'kite', 'kitten', 'kiwi', 'knee', 'knife',
  'knock', 'know', 'lab', 'label', 'labor', 'ladder', 'lady', 'lake',
  'lamp', 'language', 'laptop', 'large', 'later', 'latin', 'laugh', 'laundry',
  'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader', 'leaf',
  'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure',
  'lemon', 'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level',
  'liberty', 'library', 'license', 'life', 'lift', 'light', 'like', 'limb',
  'limit', 'link', 'lion', 'liquid', 'list', 'little', 'live', 'lizard',
  'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely', 'long',
  'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage',
  'lumber', 'lunar', 'lunch', 'luxury', 'lyrics', 'machine', 'mad', 'magic',
  'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man',
  'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march',
  'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master', 'match',
  'material', 'math', 'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean',
  'measure', 'meat', 'mechanic', 'media', 'melody', 'melt', 'member', 'memory',
  'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message',
  'metal', 'method', 'middle', 'midnight', 'milk', 'million', 'mimic', 'mind',
  'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery', 'miss', 'mistake',
  'mix', 'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment',
  'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more', 'morning',
  'mosquito', 'mother', 'motion', 'motor', 'mountain', 'mouse', 'move', 'movie',
  'much', 'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom', 'music',
  'must', 'mutual', 'myself', 'mystery', 'myth', 'naive', 'name', 'napkin',
  'narrow', 'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative',
  'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network', 'neutral',
  'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee',
  'noodle', 'normal', 'north', 'nose', 'notable', 'nothing', 'notice', 'novel',
  'now', 'nuclear', 'number', 'nurse', 'nut', 'oak', 'obey', 'object',
  'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean', 'october',
  'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old',
  'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only',
  'open', 'opera', 'opinion', 'oppose', 'option', 'orange', 'orbit', 'orchard',
  'order', 'ordinary', 'organ', 'orient', 'original', 'orphan', 'ostrich', 'other',
  'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over', 'own',
  'owner', 'oxygen', 'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair',
  'palace', 'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade',
  'parent', 'park', 'parrot', 'party', 'pass', 'patch', 'path', 'patient',
  'patrol', 'pattern', 'pause', 'pave', 'payment', 'peace', 'peanut', 'pear',
  'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper', 'perfect',
  'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical', 'piano',
  'picnic', 'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink',
  'pioneer', 'pipe', 'pistol', 'pitch', 'pizza', 'place', 'planet', 'plastic',
  'plate', 'play', 'please', 'pledge', 'pluck', 'plug', 'plunge', 'poem',
  'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony', 'pool',
  'popular', 'portion', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty',
  'powder', 'power', 'practice', 'praise', 'predict', 'prefer', 'prepare', 'present',
  'pretty', 'prevent', 'price', 'pride', 'primary', 'print', 'priority', 'prison',
  'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program', 'project',
  'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public',
  'pudding', 'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy',
  'purchase', 'purity', 'purpose', 'purse', 'push', 'put', 'puzzle', 'pyramid',
  'quality', 'quantum', 'quarter', 'question', 'quick', 'quit', 'quiz', 'quote',
  'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rage', 'rail',
  'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid',
  'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready', 'real',
  'reason', 'rebel', 'rebuild', 'recall', 'receive', 'recipe', 'record', 'recycle',
  'reduce', 'reflect', 'reform', 'region', 'regret', 'regular', 'reject', 'relax',
  'release', 'relief', 'rely', 'remain', 'remember', 'remind', 'remove', 'render',
  'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'report', 'require',
  'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat',
  'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon',
  'rice', 'rich', 'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring',
  'riot', 'ripple', 'risk', 'ritual', 'rival', 'river', 'road', 'roast',
  'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie', 'room', 'rose',
  'rotate', 'rough', 'round', 'route', 'royal', 'rubber', 'rude', 'rug',
  'rule', 'run', 'runway', 'rural', 'sad', 'saddle', 'sadness', 'safe',
  'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample',
  'sand', 'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale',
  'scan', 'scare', 'scatter', 'scene', 'scheme', 'school', 'science', 'scissors',
  'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea', 'search',
  'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek',
  'segment', 'select', 'sell', 'seminar', 'senior', 'sense', 'sentence', 'series',
  'service', 'session', 'settle', 'setup', 'seven', 'shadow', 'shaft', 'shallow',
  'share', 'shed', 'shell', 'sheriff', 'shield', 'shift', 'shine', 'ship',
  'shiver', 'shock', 'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove',
  'shrimp', 'shrug', 'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege',
  'sight', 'sign', 'silent', 'silk', 'silly', 'silver', 'similar', 'simple',
  'since', 'sing', 'siren', 'sister', 'situate', 'six', 'size', 'skate',
  'sketch', 'ski', 'skill', 'skin', 'skirt', 'skull', 'slab', 'slam',
  'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slogan', 'slot',
  'slow', 'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack',
  'snake', 'snap', 'sniff', 'snow', 'soap', 'soccer', 'social', 'sock',
  'soda', 'soft', 'solar', 'soldier', 'solid', 'solution', 'solve', 'someone',
  'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source',
  'south', 'space', 'spare', 'spatial', 'spawn', 'speak', 'special', 'speed',
  'spell', 'spend', 'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit',
  'split', 'sponsor', 'spoon', 'sport', 'spot', 'spray', 'spread', 'spring',
  'spy', 'square', 'squeeze', 'squirrel', 'stable', 'stadium', 'staff', 'stage',
  'stairs', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steel',
  'stem', 'step', 'stereo', 'stick', 'still', 'sting', 'stock', 'stomach',
  'stone', 'stool', 'story', 'stove', 'strategy', 'street', 'strike', 'strong',
  'struggle', 'student', 'stuff', 'stumble', 'style', 'subject', 'submit', 'subway',
  'success', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer',
  'sun', 'sunny', 'sunset', 'super', 'supply', 'supreme', 'sure', 'surface',
  'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp',
  'swap', 'swarm', 'swear', 'sweet', 'swim', 'swing', 'switch', 'sword',
  'symbol', 'symptom', 'syrup', 'system', 'table', 'tackle', 'tag', 'tail',
  'talent', 'talk', 'tank', 'tape', 'target', 'task', 'taste', 'tattoo',
  'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent',
  'term', 'test', 'text', 'thank', 'that', 'theme', 'then', 'theory',
  'there', 'they', 'thing', 'this', 'thought', 'three', 'thrive', 'throw',
  'thumb', 'thunder', 'ticket', 'tide', 'tiger', 'tilt', 'timber', 'time',
  'tiny', 'tip', 'tired', 'tissue', 'title', 'toast', 'tobacco', 'today',
  'toddler', 'toe', 'together', 'toilet', 'token', 'tomato', 'tomorrow', 'tone',
  'tongue', 'tonight', 'tool', 'tooth', 'top', 'topic', 'topple', 'torch',
  'tornado', 'tortoise', 'toss', 'total', 'tourist', 'toward', 'tower', 'town',
  'toy', 'track', 'trade', 'traffic', 'tragic', 'train', 'transfer', 'trap',
  'trash', 'travel', 'tray', 'treat', 'tree', 'trend', 'trial', 'tribe',
  'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble', 'truck', 'true',
  'truly', 'trumpet', 'trust', 'truth', 'try', 'tube', 'tuna', 'tunnel',
  'turkey', 'turn', 'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist',
  'two', 'type', 'typical', 'ugly', 'umbrella', 'unable', 'unaware', 'uncle',
  'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy', 'uniform', 'union',
  'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil',
  'update', 'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban', 'usage',
  'use', 'used', 'useful', 'useless', 'usual', 'utility', 'vacant', 'vacuum',
  'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various',
  'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb',
  'verify', 'version', 'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vicious',
  'victory', 'video', 'view', 'village', 'vintage', 'violin', 'virtual', 'virus',
  'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void',
  'volcano', 'volume', 'vote', 'voyage', 'wage', 'wagon', 'wait', 'walk',
  'wall', 'walnut', 'want', 'warfare', 'warm', 'warrior', 'wash', 'wasp',
  'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel',
  'weather', 'web', 'wedding', 'weekend', 'weird', 'welcome', 'well', 'west',
  'wet', 'whale', 'what', 'wheat', 'wheel', 'when', 'where', 'whip',
  'whisper', 'wide', 'width', 'wife', 'wild', 'will', 'win', 'window',
  'wine', 'wing', 'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise',
  'wish', 'witness', 'wolf', 'woman', 'wonder', 'wood', 'wool', 'word',
  'work', 'world', 'worry', 'worth', 'wrap', 'wreck', 'wrestle', 'wrist',
  'write', 'wrong', 'yard', 'year', 'yellow', 'you', 'young', 'youth',
  'zebra', 'zero', 'zone', 'zoo'
];

export const TrustWalletOnboarding: React.FC<TrustWalletOnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);

  // PIN state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Backup checkboxes state (Trust Wallet standard)
  const [checkLoss, setCheckLoss] = useState(false);
  const [checkTheft, setCheckTheft] = useState(false);
  const [checkSupport, setCheckSupport] = useState(false);

  // 12-word phrase state
  const [mnemonic, setMnemonic] = useState<string[]>(() => {
    return [...SAMPLE_MNEMONIC_POOL].sort(() => 0.5 - Math.random()).slice(0, 12);
  });
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  // Phrase verification state
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [verifyError, setVerifyError] = useState(false);

  // Import phrase state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Generated wallet
  const [createdWallet, setCreatedWallet] = useState<WalletAccount | null>(null);

  // Keypad numbers
  const handleKeypadPress = (digit: string, isConfirm: boolean) => {
    setPinError(null);
    if (!isConfirm) {
      if (pin.length < 6) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 6) {
          setTimeout(() => {
            setStep('confirm_pin');
          }, 200);
        }
      }
    } else {
      if (confirmPin.length < 6) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 6) {
          if (next === pin) {
            // Success
            setTimeout(() => {
              if (isImportMode) {
                setStep('import_phrase');
              } else {
                setStep('backup_notice');
              }
            }, 250);
          } else {
            // Mismatch
            setPinError('Коды доступа не совпадают. Попробуйте еще раз');
            setTimeout(() => {
              setConfirmPin('');
            }, 600);
          }
        }
      }
    }
  };

  const handleKeypadDelete = (isConfirm: boolean) => {
    setPinError(null);
    if (!isConfirm) {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  // Generate wallet object
  const finalizeWallet = (words: string[]) => {
    const randomHex = Math.random().toString(16).substring(2, 6);
    const randomEnd = Math.random().toString(16).substring(2, 6);
    const newWallet: WalletAccount = {
      id: 'w-main-device',
      name: 'Основной кошелек',
      address: `0x71C...${randomHex.toUpperCase()}${randomEnd.toUpperCase()}`,
      tronAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      mnemonic: words,
      totalBalanceUsd: isImportMode ? 2450.00 : 0.00,
      isBackedUp: true
    };
    setCreatedWallet(newWallet);
    setStep('success');
  };

  const handleStartVerification = () => {
    setShuffledWords([...mnemonic].sort(() => 0.5 - Math.random()));
    setSelectedWords([]);
    setVerifyError(false);
    setStep('verify_phrase');
  };

  const handleSelectWord = (word: string) => {
    if (selectedWords.includes(word)) return;
    const nextSelected = [...selectedWords, word];
    setSelectedWords(nextSelected);

    // Check if finished
    if (nextSelected.length === mnemonic.length) {
      const isCorrect = nextSelected.every((w, idx) => w === mnemonic[idx]);
      if (isCorrect) {
        finalizeWallet(mnemonic);
      } else {
        setVerifyError(true);
      }
    }
  };

  const handleRemoveWord = (index: number) => {
    setSelectedWords((prev) => prev.filter((_, i) => i !== index));
    setVerifyError(false);
  };

  const handleImportSubmit = () => {
    const words = importText.trim().toLowerCase().split(/\s+/);
    if (words.length < 12) {
      setImportError('Секретная фраза должна содержать не менее 12 слов');
      return;
    }
    finalizeWallet(words.slice(0, 12));
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-[#07090E] text-white p-5 animate-in fade-in duration-300">
      {/* 1. WELCOME SCREEN */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          <div className="flex flex-col items-center text-center mt-6">
            {/* VaultSpring Logo */}
            <div className="relative mb-6">
              <img
                src="/assets/vaultspring-logo.png"
                alt="VaultSpring Wallet"
                className="w-24 h-24 rounded-3xl object-contain shadow-[0_0_40px_rgba(139,92,246,0.35)]"
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#07090E] flex items-center justify-center shadow-lg">
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight mb-2">
              VaultSpring Wallet
            </h1>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
              Защищенный некастодиальный Web3 кошелек нового поколения
            </p>



            {/* Feature Bullets */}
            <div className="w-full space-y-2.5 text-left mb-4">
              <div className="flex items-center gap-3 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-white">Приватные ключи на вашем устройстве</div>
                  <div className="text-[11px] text-slate-400">Никто кроме вас не имеет доступа к вашим активам</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-white">Защита 6-значным ПИН-кодом</div>
                  <div className="text-[11px] text-slate-400">Надежная защита при каждом открытии приложения</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions & Terms Checkbox */}
          <div className="space-y-4 pt-4">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 leading-tight">
                Я ознакомился(-ась) и принимаю{' '}
                <span className="text-purple-400 font-medium">Условия использования</span> и{' '}
                <span className="text-purple-400 font-medium">Политику конфиденциальности</span>
              </span>
            </label>

            <button
              disabled={!acceptedTerms}
              onClick={() => {
                setIsImportMode(false);
                setStep('create_pin');
              }}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Создать новый кошелек</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              disabled={!acceptedTerms}
              onClick={() => {
                setIsImportMode(true);
                setStep('create_pin');
              }}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-white/[0.06]"
            >
              <span>У меня уже есть кошелек (Восстановить)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. CREATE PIN STEP */}
      {step === 'create_pin' && (
        <div className="flex-1 flex flex-col justify-between py-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Установите код доступа</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-8">
              Этот 6-значный ПИН-код будет запрашиваться при каждом входе в кошелек на этом телефоне
            </p>

            {/* 6 Dots */}
            <div className="flex items-center gap-4 mb-4">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pin.length > idx
                      ? 'bg-purple-500 scale-125 shadow-[0_0_12px_#A855F7]'
                      : 'bg-white/10 border border-white/20'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <span className="text-xs text-rose-400 font-medium animate-pulse">{pinError}</span>
            )}
          </div>

          {/* Trust Wallet Numeric Keypad */}
          <div className="w-full max-w-[290px] mx-auto grid grid-cols-3 gap-3.5 pb-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit, false)}
                className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-xl font-bold text-white font-mono flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleKeypadPress('0', false)}
              className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-xl font-bold text-white font-mono flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDelete(false)}
              className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.15] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
            >
              ⌫
            </button>
          </div>
        </div>
      )}

      {/* 3. CONFIRM PIN STEP */}
      {step === 'confirm_pin' && (
        <div className="flex-1 flex flex-col justify-between py-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Подтвердите код доступа</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-8">
              Повторите введенный 6-значный ПИН-код
            </p>

            {/* 6 Dots */}
            <div className="flex items-center gap-4 mb-4">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    confirmPin.length > idx
                      ? pinError
                        ? 'bg-rose-500 scale-125'
                        : 'bg-purple-500 scale-125 shadow-[0_0_12px_#A855F7]'
                      : 'bg-white/10 border border-white/20'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <span className="text-xs text-rose-400 font-medium animate-pulse">{pinError}</span>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="w-full max-w-[290px] mx-auto grid grid-cols-3 gap-3.5 pb-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit, true)}
                className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-xl font-bold text-white font-mono flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleKeypadPress('0', true)}
              className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-xl font-bold text-white font-mono flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDelete(true)}
              className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.15] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
            >
              ⌫
            </button>
          </div>
        </div>
      )}

      {/* 4. BACKUP NOTICE (Trust Wallet 3 Checkboxes) */}
      {step === 'backup_notice' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Резервная копия секретной фразы</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              На следующем шаге вы увидите секретную фразу из 12 слов, которая дает полный доступ к вашему кошельку.
            </p>

            {/* 3 Checkboxes */}
            <div className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkLoss}
                  onChange={(e) => setCheckLoss(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  Если я потеряю секретную фразу, мои средства будут безвозвратно утеряны.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkTheft}
                  onChange={(e) => setCheckTheft(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  Если я передам или покажу секретную фразу кому-либо, мои средства могут быть украдены.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkSupport}
                  onChange={(e) => setCheckSupport(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  Служба поддержки VaultSpring никогда и ни при каких обстоятельствах не запросит секретную фразу.
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={!(checkLoss && checkTheft && checkSupport)}
              onClick={() => setStep('show_phrase')}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Продолжить</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. SHOW 12-WORD SEED PHRASE */}
      {step === 'show_phrase' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">Ваша секретная фраза</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Запишите эти 12 слов на бумаге в точном порядке и сохраните в надежном месте offline.
            </p>

            {/* 12-word Grid */}
            <div className="grid grid-cols-3 gap-2.5 bg-black/50 p-3.5 rounded-2xl border border-white/10 mb-4">
              {mnemonic.map((word, idx) => (
                <div
                  key={idx}
                  className="bg-white/[0.04] p-2.5 rounded-xl flex items-center justify-between px-2.5 text-xs border border-white/[0.04]"
                >
                  <span className="text-slate-500 text-[10px] select-none font-mono">{idx + 1}.</span>
                  <span className="font-mono font-bold text-white tracking-wide">{word}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(mnemonic.join(' '));
                setCopiedPhrase(true);
                setTimeout(() => setCopiedPhrase(false), 2000);
              }}
              className="w-full py-2.5 bg-white/[0.05] hover:bg-white/[0.09] rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-white/[0.06] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedPhrase ? 'Фраза скопирована!' : 'Скопировать в буфер обмена'}</span>
            </button>

            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
              <Shield className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>Не делайте скриншот и не пересылайте фразу через мессенджеры.</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={handleStartVerification}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Продолжить проверку</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => finalizeWallet(mnemonic)}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Пропустить проверку (я уже записал фразу)
            </button>
          </div>
        </div>
      )}

      {/* 6. VERIFY PHRASE STEP */}
      {step === 'verify_phrase' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">Подтвердите секретную фразу</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Нажимайте на слова в том порядке, в котором они были показаны ранее:
            </p>

            {/* Selected Words Area */}
            <div className="min-h-[110px] bg-black/50 p-3 rounded-2xl border border-white/10 flex flex-wrap gap-1.5 mb-4 items-start">
              {selectedWords.length === 0 ? (
                <span className="text-xs text-slate-500 m-auto">Слова появятся здесь по нажатию...</span>
              ) : (
                selectedWords.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRemoveWord(idx)}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-xs font-mono text-purple-200 flex items-center gap-1.5 hover:bg-rose-500/30 transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] text-purple-400">{idx + 1}.</span>
                    <span>{word}</span>
                  </button>
                ))
              )}
            </div>

            {verifyError && (
              <div className="mb-3 text-xs text-rose-400 font-medium text-center">
                Неверный порядок слов. Попробуйте еще раз.
              </div>
            )}

            {/* Shuffled Available Words */}
            <div className="flex flex-wrap gap-2 justify-center">
              {shuffledWords.map((word, idx) => {
                const isSelected = selectedWords.includes(word);
                return (
                  <button
                    key={idx}
                    disabled={isSelected}
                    onClick={() => handleSelectWord(word)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'opacity-25 bg-white/[0.02] border border-white/[0.04] text-slate-500 cursor-not-allowed'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] active:bg-purple-600 text-white border border-white/[0.08]'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedWords([]);
                setVerifyError(false);
              }}
              className="w-1/3 py-3 rounded-xl bg-white/[0.05] text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>

            <button
              onClick={() => finalizeWallet(mnemonic)}
              className="w-2/3 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              Пропустить и завершить
            </button>
          </div>
        </div>
      )}

      {/* 7. IMPORT SEED PHRASE */}
      {step === 'import_phrase' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Импорт существующего кошелька</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Введите вашу секретную фразу из 12 или 24 слов, разделяя слова пробелами:
            </p>

            <textarea
              rows={5}
              placeholder="Введите 12 слов через пробел (например: venture silent galaxy crypto spring vault harvest...)"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
            />

            {importError && (
              <span className="text-xs text-rose-400 mt-2 block">{importError}</span>
            )}

            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-300">
              Кошелек будет привязан к данному устройству с созданным 6-значным ПИН-кодом.
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <button
              onClick={() => setStep('welcome')}
              className="w-1/3 py-3.5 rounded-2xl bg-white/[0.06] text-slate-300 font-semibold text-xs"
            >
              Назад
            </button>
            <button
              disabled={!importText.trim()}
              onClick={handleImportSubmit}
              className="w-2/3 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs"
            >
              Восстановить кошелек
            </button>
          </div>
        </div>
      )}

      {/* 8. SUCCESS SCREEN */}
      {step === 'success' && createdWallet && (
        <div className="flex-1 flex flex-col justify-between py-6 items-center text-center">
          <div className="flex flex-col items-center mt-10">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Кошелек успешно создан!</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
              Ваш телефон надежно защищен. ПИН-код сохранен и будет запрашиваться при открытии приложения.
            </p>

            <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Имя кошелька</span>
                <span className="text-xs font-bold text-white">{createdWallet.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Статус</span>
                <span className="text-xs text-emerald-400 font-semibold">Защищен шифрованием</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">ПИН-код</span>
                <span className="text-xs text-emerald-400 font-mono">● ● ● ● ● ● (Запомнен)</span>
              </div>
            </div>
          </div>

          <div className="w-full pt-6">
            <button
              onClick={() => onComplete(createdWallet, pin)}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Открыть VaultSpring Wallet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
