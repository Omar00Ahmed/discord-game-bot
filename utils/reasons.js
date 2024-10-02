const reasons = [
    {
        label: 'سبام في الشات',
        description: 'تكرار الرسائل في الشات',
        value: 'سبام في الشات',
        suggestedDuration:" ساعة واحدة "
    },
    {
        label: 'اسلوب غير لائق',
        description: 'تصرف غير لائق من المستخدم',
        value: 'اسلوب غير لائق',
        suggestedDuration:" ثلاث ساعات "
    },
    {
        label: 'التنمر',
        description: 'التنمر علي الاعضاء بشكل مباشر او غير مباشر',
        value: 'التنمر',
        suggestedDuration:" 12 ساعة "
    },
    {
        label: 'نشر روابط',
        description: 'نشر روابط سيرفرات وجروبات اخرى',
        value: 'نشر روابط',
        suggestedDuration:" 12 ساعة "
    },
    {
        label: 'التحريض علي الكراهية',
        description: 'التحريض علي الكراهية',
        value: 'التحريض علي الكراهية',
        suggestedDuration:" 24 ساعة "
    },
    {
        label: 'مخالفة القوانين',
        description: 'مخالفة القوانين الموضحة في السيرفر',
        value: 'مخالفة القوانين',
        suggestedDuration:" 24 ساعة "
    },
    {
        label: 'عدم احترام الادارة',
        description: 'عدم احترام ادارة السيرفر',
        value: 'عدم احترام الادارة',
        suggestedDuration:" من ساعة واحدة الي 72 ساعة "
    },
    {
        label: 'كلام غير لائق',
        description: 'التكلم بطريقة غير لائقة',
        value: "كلام غير لائق",
        suggestedDuration:" من 24 ساعة اللي 72 ساعة  "
    },
    {
        label: 'التشفير بالغلط',
        description: '...',
        value: "التشفير بالغلط",
        suggestedDuration:" 72 ساعة "
    },
    {
        label: 'الغلط على الاهل',
        description: 'الغلط علي الاهل ',
        value: "الغلط على الاهل",
        suggestedDuration:" 120 ساعة "
    },
    {
        label: 'قذف الاهل والقذف العام',
        description: 'قذف الاهل والقذف العام ',
        value: "قذف الاهل والقذف العام",
        suggestedDuration:" ban "
    },
];

const durations = [
    {
        label: '1 hour',
        value: '1',
    },
    {
        label: '3 hours',
        value: '3',
    },
    {
        label: '6 hours',
        value: '6',
    },
    {
        label: '12 hours',
        value: '12',
    },
    {
        label: '24 hours',
        value: '24',
    },
    {
        label: '36 hours',
        value: '36',
    },
    {
        label: '48 hours',
        value: '48',
    },
    {
        label: '56 hours',
        value: '56',
    },
    {
        label: '72 hours',
        value: '72',
    },
    {
        label: '120 hours',
        value: '120',
    },
    {
        label: 'BAN',
        value: '999',
    },    
    
]

module.exports = {
    reasons,
    durations
};