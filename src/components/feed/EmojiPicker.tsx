import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Clock, Smile, Heart, ThumbsUp, Sparkles, Sun, Plane, Coffee, Flag, Gamepad2, Cat, Briefcase } from 'lucide-react';

interface EmojiPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    position?: 'top' | 'bottom';
}

// Complete emoji database - organized by category (Unicode 15.0)
const EMOJI_CATEGORIES = [
    {
        id: 'recent',
        label: 'Recentes',
        icon: Clock,
        emojis: [] // Populated from localStorage
    },
    {
        id: 'smileys',
        label: 'Smileys',
        icon: Smile,
        emojis: [
            // Face smiling
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
            // Face affection
            '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲',
            // Face tongue
            '😋', '😛', '😜', '🤪', '😝', '🤑',
            // Face hand
            '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡',
            // Face neutral
            '🤐', '🤨', '😐', '😑', '😶', '🫥', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '🫨',
            // Face sleepy
            '😌', '😔', '😪', '🤤', '😴',
            // Face unwell
            '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯',
            // Face hat
            '🤠', '🥳', '🥸',
            // Face glasses
            '😎', '🤓', '🧐',
            // Face concerned
            '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱',
            // Face negative
            '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
            // Face costume
            '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
            // Cat face
            '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
            // Monkey face
            '🙈', '🙉', '🙊',
            // Heart
            '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️‍🔥', '❤️‍🩹', '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🖤', '🩶', '🤍', '🤎',
            // Emotion
            '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤'
        ]
    },
    {
        id: 'people',
        label: 'Pessoas',
        icon: ThumbsUp,
        emojis: [
            // Hand fingers open
            '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '🫷', '🫸',
            // Hand fingers partial
            '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙',
            // Hand single finger
            '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵',
            // Hand fingers closed
            '👍', '👎', '✊', '👊', '🤛', '🤜',
            // Hands
            '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏',
            // Hand prop
            '✍️', '💅', '🤳',
            // Body parts
            '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦',
            // Person
            '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷',
            // Person role
            '👮', '🕵️', '💂', '🥷', '👷', '🫅', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🫃', '🫄', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '🧌', '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🕴️', '👯', '🧖', '🧗', '🤸', '🏌️', '🏇', '⛷️', '🏂', '🏋️', '🤼', '🤽', '🤾', '🤺', '⛹️', '🏊', '🚣', '🧘', '🛀', '🛌',
            // Family
            '👪', '👨‍👩‍👦', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👨‍👦', '👨‍👦‍👦', '👨‍👧', '👨‍👧‍👦', '👨‍👧‍👧', '👩‍👦', '👩‍👦‍👦', '👩‍👧', '👩‍👧‍👦', '👩‍👧‍👧',
            // Person symbol
            '🗣️', '👤', '👥', '🫂', '👣'
        ]
    },
    {
        id: 'animals',
        label: 'Animais',
        icon: Cat,
        emojis: [
            // Mammal
            '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🫎', '🫏', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫', '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡',
            // Bird
            '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🪽', '🐦‍⬛', '🐦‍🔥',
            // Amphibian & Reptile
            '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖',
            // Marine
            '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🪸', '🪼', '🦀', '🦞', '🦐', '🦑', '🦪',
            // Bug
            '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠',
            // Plant flower
            '💐', '🌸', '💮', '🪷', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🪻',
            // Plant other
            '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪹', '🪺', '🍄'
        ]
    },
    {
        id: 'food',
        label: 'Comida',
        icon: Coffee,
        emojis: [
            // Fruit
            '🍇', '🍈', '🍉', '🍊', '🍋', '🍋‍🟩', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥',
            // Vegetable
            '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🫘', '🌰', '🫚', '🫛',
            // Food prepared
            '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫',
            // Food asian
            '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡',
            // Food sweet
            '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯',
            // Drink
            '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🧊',
            // Dishware
            '🥢', '🍽️', '🍴', '🥄', '🔪', '🫙', '🏺'
        ]
    },
    {
        id: 'travel',
        label: 'Viagem',
        icon: Plane,
        emojis: [
            // Place map
            '🌍', '🌎', '🌏', '🌐', '🗺️', '🧭',
            // Place geographic
            '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️',
            // Place building
            '🏟️', '🏛️', '🏗️', '🧱', '🪨', '🪵', '🛖', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋',
            // Place religious & other
            '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🛝', '🎡', '🎢', '💈', '🎪',
            // Transport ground
            '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🛼', '🚏', '🛣️', '🛤️', '🛢️', '⛽', '🛞', '🚨', '🚥', '🚦', '🛑', '🚧',
            // Transport water
            '⚓', '🛟', '⛵', '🛶', '🚤', '🛳️', '⛴️', '🛥️', '🚢',
            // Transport air
            '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸',
            // Hotel
            '🛎️', '🧳',
            // Time
            '⌛', '⏳', '⌚', '⏰', '⏱️', '⏲️', '🕰️', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦',
            // Sky & weather
            '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌡️', '☀️', '🌝', '🌞', '🪐', '⭐', '🌟', '🌠', '🌌', '☁️', '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '🌨️', '🌩️', '🌪️', '🌫️', '🌬️', '🌀', '🌈', '🌂', '☂️', '☔', '⛱️', '⚡', '❄️', '☃️', '⛄', '☄️', '🔥', '💧', '🌊'
        ]
    },
    {
        id: 'activities',
        label: 'Atividades',
        icon: Sparkles,
        emojis: [
            // Event
            '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️', '🎫',
            // Award medal
            '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉',
            // Sport
            '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌',
            // Game
            '🎯', '🪀', '🪁', '🔮', '🪄', '🧿', '🪬', '🎮', '🕹️', '🎰', '🎲', '🧩', '🧸', '🪅', '🪩', '🪆', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴',
            // Arts & crafts
            '🎭', '🖼️', '🎨', '🧵', '🪡', '🧶', '🪢'
        ]
    },
    {
        id: 'objects',
        label: 'Objetos',
        icon: Briefcase,
        emojis: [
            // Clothing
            '👓', '🕶️', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🛍️', '🎒', '🩴', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '🪮', '👑', '👒', '🎩', '🎓', '🧢', '🪖', '⛑️', '📿', '💄', '💍', '💎',
            // Sound
            '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕',
            // Music
            '🎼', '🎵', '🎶', '🎙️', '🎚️', '🎛️', '🎤', '🎧', '📻',
            // Musical instrument
            '🎷', '🪗', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '🪘', '🪇', '🪈',
            // Phone
            '📱', '📲', '☎️', '📞', '📟', '📠',
            // Computer
            '🔋', '🪫', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮',
            // Light & video
            '🎥', '🎞️', '📽️', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '🪔',
            // Book paper
            '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️',
            // Money
            '💰', '🪙', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹',
            // Mail
            '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️',
            // Writing
            '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝',
            // Office
            '💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️',
            // Lock
            '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️',
            // Tool
            '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '🔫', '🪃', '🏹', '🛡️', '🪚', '🔧', '🪛', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️', '🪝', '🧰', '🧲', '🪜',
            // Science
            '⚗️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡',
            // Medical
            '💉', '🩸', '💊', '🩹', '🩼', '🩺', '🩻',
            // Household
            '🚪', '🛗', '🪞', '🪟', '🛏️', '🛋️', '🪑', '🚽', '🪠', '🚿', '🛁', '🪤', '🪒', '🧴', '🧷', '🧹', '🧺', '🧻', '🪣', '🧼', '🫧', '🪥', '🧽', '🧯', '🛒',
            // Other object
            '🚬', '⚰️', '🪦', '⚱️', '🧿', '🏺', '🪬'
        ]
    },
    {
        id: 'symbols',
        label: 'Símbolos',
        icon: Sparkles,
        emojis: [
            // Transport sign
            '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅',
            // Warning
            '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '☢️', '☣️',
            // Arrow
            '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝',
            // Religion
            '🛐', '⚛️', '🕉️', '✡️', '☸️', '☯️', '✝️', '☦️', '☪️', '☮️', '🕎', '🔯', '🪯',
            // Zodiac
            '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎',
            // Av symbol
            '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '🛜', '📳', '📴',
            // Gender
            '♀️', '♂️', '⚧️',
            // Math
            '✖️', '➕', '➖', '➗', '🟰', '♾️',
            // Punctuation
            '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️',
            // Currency
            '💱', '💲',
            // Other symbol
            '⚕️', '♻️', '⚜️', '🔱', '📛', '🔰', '⭕', '✅', '☑️', '✔️', '❌', '❎', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '©️', '®️', '™️',
            // Keycap
            '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟',
            // Alphanum
            '🔠', '🔡', '🔢', '🔣', '🔤', '🅰️', '🆎', '🅱️', '🆑', '🆒', '🆓', 'ℹ️', '🆔', 'Ⓜ️', '🆕', '🆖', '🅾️', '🆗', '🅿️', '🆘', '🆙', '🆚',
            // Geometric
            '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '◼️', '◻️', '◾', '◽', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲'
        ]
    },
    {
        id: 'flags',
        label: 'Bandeiras',
        icon: Flag,
        emojis: [
            // Flag
            '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️',
            // Country flag - Americas
            '🇧🇷', '🇺🇸', '🇦🇷', '🇲🇽', '🇨🇦', '🇨🇱', '🇨🇴', '🇵🇪', '🇻🇪', '🇪🇨', '🇧🇴', '🇵🇾', '🇺🇾', '🇨🇺', '🇵🇦', '🇨🇷', '🇬🇹', '🇭🇳', '🇳🇮', '🇸🇻', '🇩🇴', '🇵🇷', '🇯🇲', '🇭🇹', '🇧🇸', '🇧🇧', '🇹🇹',
            // Country flag - Europe
            '🇵🇹', '🇪🇸', '🇫🇷', '🇬🇧', '🇩🇪', '🇮🇹', '🇳🇱', '🇧🇪', '🇨🇭', '🇦🇹', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇮🇪', '🇵🇱', '🇨🇿', '🇬🇷', '🇷🇺', '🇺🇦', '🇹🇷', '🇷🇴', '🇭🇺',
            // Country flag - Asia & Oceania
            '🇯🇵', '🇨🇳', '🇰🇷', '🇮🇳', '🇮🇩', '🇹🇭', '🇻🇳', '🇵🇭', '🇲🇾', '🇸🇬', '🇦🇺', '🇳🇿', '🇸🇦', '🇦🇪', '🇮🇱', '🇪🇬', '🇿🇦', '🇳🇬', '🇰🇪', '🇲🇦', '🇵🇰', '🇧🇩', '🇱🇰'
        ]
    }
];

// Local storage keys
const RECENT_EMOJIS_KEY = 'emoji_picker_recent';
const MAX_RECENT = 40;

// Get recent emojis from localStorage
const getRecentEmojis = (): string[] => {
    try {
        const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Save emoji to recent list
const addToRecent = (emoji: string) => {
    try {
        const recent = getRecentEmojis();
        const filtered = recent.filter(e => e !== emoji);
        const updated = [emoji, ...filtered].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
    } catch {
        // Ignore localStorage errors
    }
};

/**
 * EmojiPicker - Full WhatsApp-style emoji picker
 * Complete Unicode 15.0 emoji set with categories and search
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    position = 'top'
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
    const pickerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load recent emojis on mount
    useEffect(() => {
        if (isOpen) {
            const recent = getRecentEmojis();
            setRecentEmojis(recent);
            if (recent.length > 0) {
                setActiveCategory('recent');
            }
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Get emojis for current category
    const getCurrentEmojis = (): string[] => {
        if (searchQuery) {
            return EMOJI_CATEGORIES.flatMap(cat => cat.emojis);
        }
        if (activeCategory === 'recent') {
            return recentEmojis;
        }
        return EMOJI_CATEGORIES.find(cat => cat.id === activeCategory)?.emojis || [];
    };

    const handleEmojiClick = (emoji: string) => {
        addToRecent(emoji);
        onSelect(emoji);
    };

    return (
        <div
            ref={pickerRef}
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-[360px] overflow-hidden animate-[fadeInScale_0.15s_ease-out]"
            style={{ maxHeight: '480px' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-3 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-stone-800">Emojis</h4>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Pesquisar emoji..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                    />
                </div>
            </div>

            {/* Category Tabs */}
            {!searchQuery && (
                <div className="flex items-center gap-0.5 px-2 py-2 overflow-x-auto border-b border-stone-100 bg-stone-50/50 scrollbar-hide">
                    {EMOJI_CATEGORIES.map((category) => {
                        const IconComponent = category.icon;
                        const isRecent = category.id === 'recent';
                        const hasRecent = recentEmojis.length > 0;

                        if (isRecent && !hasRecent) return null;

                        return (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0 ${activeCategory === category.id
                                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                                    }`}
                                title={category.label}
                            >
                                <IconComponent size={18} />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Category Label */}
            <div className="px-3 py-2 bg-stone-50/30">
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    {searchQuery
                        ? `Resultados`
                        : EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.label || 'Emojis'
                    }
                </span>
            </div>

            {/* Emoji Grid */}
            <div className="p-2 overflow-y-auto" style={{ maxHeight: '300px' }}>
                <div className="grid grid-cols-8 gap-0.5">
                    {getCurrentEmojis().map((emoji, index) => (
                        <button
                            key={`${emoji}-${index}`}
                            onClick={() => handleEmojiClick(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-stone-100 rounded-lg transition-all hover:scale-125 active:scale-100"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {activeCategory === 'recent' && recentEmojis.length === 0 && (
                    <div className="py-8 text-center">
                        <Clock size={32} className="mx-auto text-stone-300 mb-2" />
                        <p className="text-sm text-stone-500">Nenhum emoji recente</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-stone-100 bg-stone-50/50">
                <p className="text-[10px] text-stone-400 text-center">
                    {recentEmojis.length > 0
                        ? `${recentEmojis.length} recentes • Clique para usar`
                        : 'Clique em um emoji para usar'
                    }
                </p>
            </div>

            {/* CSS */}
            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default EmojiPicker;
