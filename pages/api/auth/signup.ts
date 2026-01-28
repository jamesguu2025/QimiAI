import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name } = req.body;

  // 验证输入
  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  // 验证密码强度
  if (password.length < 8) {
    return res.status(400).json({ error: '密码至少需要8个字符' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      if (existingUser.password_hash) {
        return res.status(400).json({ error: '该邮箱已注册，请直接登录' });
      } else {
        return res.status(400).json({
          error: '该邮箱已通过 Google/Facebook 注册，请使用第三方登录'
        });
      }
    }

    // 哈希密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        name: name?.trim() || null,
        password_hash: passwordHash,
        provider: 'email',
      })
      .select('id, email, name')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({ error: '注册失败，请稍后重试' });
    }

    return res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}
