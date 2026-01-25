// Conversation scenarios for Bosnian learning
const scenarios = [
    {
        id: 'cafe-greeting',
        title: 'Kafana Meeting',
        description: 'Meeting a friend at a café',
        icon: '☕',
        difficulty: 'Beginner',
        conversation: [
            {
                speaker: 'bot',
                bosnian: 'Hej! Kako si?',
                english: 'Hey! How are you?',
                responses: [
                    {
                        bosnian: 'Dobro sam, hvala! A ti?',
                        english: 'I\'m good, thanks! And you?',
                        feedback: 'Perfect! Natural greeting response.',
                        next: 1
                    },
                    {
                        bosnian: 'Super! Šta ima?',
                        english: 'Great! What\'s up?',
                        feedback: 'Good! "Šta ima" is very casual and common.',
                        next: 1
                    },
                    {
                        bosnian: 'Evo, može. Ti?',
                        english: 'Alright, okay. You?',
                        feedback: 'Nice! "Evo, može" is very Bosnian - means "it\'s okay".',
                        next: 1
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Dobro, dobro. Hoćeš li kafu?',
                english: 'Good, good. Do you want coffee?',
                culturalNote: 'Coffee culture is huge in Bosnia. Expect long conversations over tiny cups!',
                responses: [
                    {
                        bosnian: 'Da, hoću! Hvala.',
                        english: 'Yes, I want! Thanks.',
                        feedback: 'Great! Simple and clear.',
                        next: 2
                    },
                    {
                        bosnian: 'Ajde, može jedna.',
                        english: 'Come on, one is fine.',
                        feedback: 'Excellent! "Ajde" is very common - means "come on/let\'s go".',
                        next: 2
                    },
                    {
                        bosnian: 'Ne hvala, možda kasnije.',
                        english: 'No thanks, maybe later.',
                        feedback: 'Polite refusal. Works well!',
                        next: 2
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Odlično! Šta radiš danas?',
                english: 'Excellent! What are you doing today?',
                responses: [
                    {
                        bosnian: 'Ništa posebno, samo se odmoram.',
                        english: 'Nothing special, just resting.',
                        feedback: 'Perfect answer! Very natural.',
                        next: 3
                    },
                    {
                        bosnian: 'Radim, imam posla.',
                        english: 'Working, I have work.',
                        feedback: 'Good! "Imam posla" is common way to say you\'re busy.',
                        next: 3
                    },
                    {
                        bosnian: 'Ne znam još, vidjet ćemo.',
                        english: 'Don\'t know yet, we\'ll see.',
                        feedback: 'Nice! "Vidjet ćemo" is very useful phrase.',
                        next: 3
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Ajde, idemo da sjednemo.',
                english: 'Come on, let\'s go sit down.',
                culturalNote: '"Ajde" is one of the most useful words - means come on, let\'s go, or okay depending on context.',
                responses: [
                    {
                        bosnian: 'Idemo!',
                        english: 'Let\'s go!',
                        feedback: 'Perfect! Short and enthusiastic.',
                        next: 'complete'
                    },
                    {
                        bosnian: 'Može, može.',
                        english: 'Okay, okay.',
                        feedback: 'Great! Repeating "može" shows agreement.',
                        next: 'complete'
                    }
                ]
            }
        ]
    },
    {
        id: 'football-talk',
        title: 'Football Discussion',
        description: 'Talking about football with friends',
        icon: '⚽',
        difficulty: 'Beginner',
        conversation: [
            {
                speaker: 'bot',
                bosnian: 'Jesi li gledao utakmicu sinoć?',
                english: 'Did you watch the match last night?',
                responses: [
                    {
                        bosnian: 'Da, gledao sam! Bila je odlična.',
                        english: 'Yes, I watched! It was excellent.',
                        feedback: 'Perfect! Shows past tense naturally.',
                        next: 1
                    },
                    {
                        bosnian: 'Nisam, šta se desilo?',
                        english: 'I didn\'t, what happened?',
                        feedback: 'Good question! "Šta se desilo" is very common.',
                        next: 1
                    },
                    {
                        bosnian: 'Malo sam vidio, ko je pobijedio?',
                        english: 'I saw a bit, who won?',
                        feedback: 'Nice! Shows you know past tense.',
                        next: 1
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Pobjedili smo 3:1! Nevjerovatno!',
                english: 'We won 3:1! Unbelievable!',
                culturalNote: 'Football is serious business. People say "we" when talking about their team.',
                responses: [
                    {
                        bosnian: 'Super! Ko je dao golove?',
                        english: 'Great! Who scored the goals?',
                        feedback: 'Excellent question! Very natural.',
                        next: 2
                    },
                    {
                        bosnian: 'Sjajno! Nisam mogao vjerovati!',
                        english: 'Awesome! I couldn\'t believe it!',
                        feedback: 'Perfect emotional response!',
                        next: 2
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Hoćeš li idemo na sljedeću utakmicu zajedno?',
                english: 'Do you want to go to the next match together?',
                responses: [
                    {
                        bosnian: 'Ajde, idemo! Kad je?',
                        english: 'Come on, let\'s go! When is it?',
                        feedback: 'Perfect enthusiasm! "Ajde" is perfect here.',
                        next: 3
                    },
                    {
                        bosnian: 'Može, ako imam vremena.',
                        english: 'Okay, if I have time.',
                        feedback: 'Good conditional response!',
                        next: 3
                    },
                    {
                        bosnian: 'Ne znam, moram vidjeti.',
                        english: 'I don\'t know, I have to see.',
                        feedback: 'Natural way to show uncertainty.',
                        next: 3
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'U redu, javiću ti kad znam tačno.',
                english: 'Okay, I\'ll let you know when I know exactly.',
                responses: [
                    {
                        bosnian: 'Super, hvala!',
                        english: 'Great, thanks!',
                        feedback: 'Perfect closing!',
                        next: 'complete'
                    },
                    {
                        bosnian: 'Dobro, čujemo se!',
                        english: 'Good, we\'ll hear from each other!',
                        feedback: 'Excellent! "Čujemo se" is how people say "talk to you later".',
                        next: 'complete'
                    }
                ]
            }
        ]
    },
    {
        id: 'family-dinner',
        title: 'Family Dinner',
        description: 'First time meeting friend\'s family',
        icon: '🍽️',
        difficulty: 'Intermediate',
        conversation: [
            {
                speaker: 'bot',
                bosnian: 'Dobro došao! Uđi, uđi!',
                english: 'Welcome! Come in, come in!',
                culturalNote: 'Hospitality is extremely important. Expect to be fed A LOT.',
                responses: [
                    {
                        bosnian: 'Hvala vam puno! Drago mi je.',
                        english: 'Thank you very much! Nice to meet you.',
                        feedback: 'Perfect! Using "vam" shows respect to elders.',
                        next: 1
                    },
                    {
                        bosnian: 'Hvala što ste me pozvali!',
                        english: 'Thanks for inviting me!',
                        feedback: 'Excellent! Very polite.',
                        next: 1
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Hoćeš li nešto jesti? Imam sarmi, ćevapa...',
                english: 'Do you want to eat something? I have sarma, ćevapi...',
                culturalNote: 'Always say yes to food! Refusing is seen as rude.',
                responses: [
                    {
                        bosnian: 'Da, molim! Sve izgleda odlično.',
                        english: 'Yes, please! Everything looks great.',
                        feedback: 'Perfect response! Shows appreciation.',
                        next: 2
                    },
                    {
                        bosnian: 'Hvala, probat ću malo svega.',
                        english: 'Thanks, I\'ll try a bit of everything.',
                        feedback: 'Great! Shows you want to taste everything.',
                        next: 2
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Uzmi, uzmi više! Ne stidi se!',
                english: 'Take, take more! Don\'t be shy!',
                responses: [
                    {
                        bosnian: 'Hvala, baš je ukusno!',
                        english: 'Thanks, it\'s really tasty!',
                        feedback: 'Perfect compliment! "Ukusno" means delicious.',
                        next: 3
                    },
                    {
                        bosnian: 'Sve je odlično, hvala vam!',
                        english: 'Everything is excellent, thank you!',
                        feedback: 'Great! Shows appreciation for the meal.',
                        next: 3
                    }
                ]
            },
            {
                speaker: 'bot',
                bosnian: 'Drago mi je! Dođi opet kada hoćeš!',
                english: 'I\'m glad! Come again whenever you want!',
                responses: [
                    {
                        bosnian: 'Hvala vam puno, sigurno hoću!',
                        english: 'Thank you very much, I definitely will!',
                        feedback: 'Perfect! Shows you appreciate the hospitality.',
                        next: 'complete'
                    },
                    {
                        bosnian: 'Bilo mi je jako lijepo, hvala!',
                        english: 'It was very nice for me, thanks!',
                        feedback: 'Excellent! Very polite way to end.',
                        next: 'complete'
                    }
                ]
            }
        ]
    }
];
