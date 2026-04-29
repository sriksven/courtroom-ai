const FALLACY_TYPES = [
  {
    name: 'Ad Hominem',
    description: 'Attacking the character or personal traits of the opponent rather than addressing their argument.',
    example: 'The defense cannot be trusted because the defendant once returned a library book two weeks late.',
  },
  {
    name: 'Straw Man',
    description: 'Misrepresenting someone\'s argument to make it easier to attack.',
    example: 'The prosecution claims we are arguing the defendant is a saint — we merely said they did not commit this particular crime.',
  },
  {
    name: 'Appeal to Authority',
    description: 'Using the opinion of an authority figure as evidence without supporting reasoning.',
    example: 'My expert witness, who has a PhD in something adjacent to this topic, assures me the defendant is guilty.',
  },
  {
    name: 'False Dichotomy',
    description: 'Presenting only two options as if no other possibilities exist.',
    example: 'Either the defendant planned this crime for years, or they are completely innocent — there is no middle ground.',
  },
  {
    name: 'Slippery Slope',
    description: 'Claiming one event will inevitably lead to an extreme consequence without justification.',
    example: 'If we acquit the defendant today, by next Tuesday everyone in this city will be stealing concepts from the collective consciousness.',
  },
  {
    name: 'Red Herring',
    description: 'Introducing irrelevant information to distract from the actual issue.',
    example: 'Before we discuss the evidence, I would like to note that the prosecutor\'s tie is an unusual shade of burgundy.',
  },
  {
    name: 'Appeal to Emotion',
    description: 'Manipulating emotions rather than using logic to make an argument.',
    example: 'Think of the children who will grow up in a world where dramatic pauses are used without restraint — is that the future we want?',
  },
  {
    name: 'Circular Reasoning',
    description: 'Using the conclusion as a premise in the argument, making it self-referential and unfounded.',
    example: 'The defendant is guilty because they committed the crime, and we know they committed the crime because they are guilty.',
  },
  {
    name: 'Hasty Generalization',
    description: 'Drawing a broad conclusion from a small or unrepresentative sample.',
    example: 'Three people at the defendant\'s office felt vaguely unsettled by their questions, therefore the defendant is a menace to all workplaces.',
  },
  {
    name: 'Post Hoc',
    description: 'Assuming that because one event followed another, the first caused the second.',
    example: 'The defendant made eye contact with the pigeon at 2 PM, and by 3 PM the pigeon had stopped eating — clearly a causal link.',
  },
  {
    name: 'Burden of Proof Reversal',
    description: 'Shifting the responsibility of proof onto the wrong party.',
    example: 'The defendant has failed to prove they did not steal Monday — silence on this matter is as good as a confession.',
  },
  {
    name: 'Anecdotal Evidence',
    description: 'Using a personal story or isolated example as evidence for a general claim.',
    example: 'My neighbor once used a dramatic pause inappropriately and lost his job, his home, and his fish — this pattern is universal.',
  },
  {
    name: 'Appeal to Popularity',
    description: 'Claiming something is true or right because many people believe or do it.',
    example: 'Millions of people agree the defendant\'s handwriting is suspicious — that level of consensus cannot be wrong.',
  },
  {
    name: 'False Equivalence',
    description: 'Treating two fundamentally different things as if they are the same.',
    example: 'Using a dramatic pause without license is essentially the same as perjury — both involve a kind of deception.',
  },
  {
    name: 'Whataboutism',
    description: 'Deflecting criticism by pointing to someone else\'s wrongdoing rather than addressing the argument.',
    example: 'Yes, my client may have exceeded permissible pre-coffee confidence, but what about the prosecutor, who once gave directions with absolute certainty and was wrong?',
  },
]

export default FALLACY_TYPES
