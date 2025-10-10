import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample teams
  const team1 = await prisma.team.upsert({
    where: { id: 'team-1' },
    update: {},
    create: {
      id: 'team-1',
      name: 'מכבי תל אביב',
      shortName: 'מכבי ת״א',
      primaryColor: '#004B87',
      secondaryColor: '#FFD700',
    },
  });

  const team2 = await prisma.team.upsert({
    where: { id: 'team-2' },
    update: {},
    create: {
      id: 'team-2',
      name: 'הפועל תל אביב',
      shortName: 'הפועל ת״א',
      primaryColor: '#FF0000',
      secondaryColor: '#FFFFFF',
    },
  });

  // Create sample players
  const players = [
    { name: 'דניאל כהן', position: 'GOALKEEPER', jerseyNumber: 1, teamId: team1.id },
    { name: 'יוסי לוי', position: 'DEFENDER', jerseyNumber: 2, teamId: team1.id },
    { name: 'אמיר אברהם', position: 'MIDFIELDER', jerseyNumber: 10, teamId: team1.id },
    { name: 'רון מזרחי', position: 'FORWARD', jerseyNumber: 9, teamId: team1.id },
    { name: 'עידו שמעון', position: 'GOALKEEPER', jerseyNumber: 1, teamId: team2.id },
    { name: 'טל דוד', position: 'DEFENDER', jerseyNumber: 3, teamId: team2.id },
    { name: 'נועם יוסף', position: 'MIDFIELDER', jerseyNumber: 8, teamId: team2.id },
    { name: 'איתן בן יוסף', position: 'FORWARD', jerseyNumber: 11, teamId: team2.id },
  ];

  for (const player of players) {
    await prisma.player.upsert({
      where: { 
        teamId_jerseyNumber: { 
          teamId: player.teamId, 
          jerseyNumber: player.jerseyNumber 
        } 
      },
      update: {},
      create: {
        name: player.name,
        position: player.position as any,
        jerseyNumber: player.jerseyNumber,
        teamId: player.teamId,
      },
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`Created teams: ${team1.name}, ${team2.name}`);
  console.log(`Created ${players.length} players`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });